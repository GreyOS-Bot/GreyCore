const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const { PermissionFlagsBits } = require("discord.js");
const preflight = require("../scripts/audit-validation-bridge-preflight.cjs");

function createDatabase({ phase2 = false } = {}) {
    const db = new Database(":memory:");
    db.exec(`
        CREATE TABLE Guilds (id TEXT PRIMARY KEY);
        CREATE TABLE GuildSettingsV2 (
            guild_id TEXT PRIMARY KEY,
            validation_channel_id TEXT
        );
        CREATE TABLE GuildStaffPermissionSettingsV2 (
            guild_id TEXT PRIMARY KEY,
            validation_channel_grants_access INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE GuildStaffRolePermissionsV2 (
            guild_id TEXT,
            role_id TEXT,
            permission_key TEXT
            ${phase2 ? ", effect TEXT" : ""}
        );
        CREATE TABLE GuildStaffUserPermissionsV2 (
            guild_id TEXT,
            discord_user_id TEXT,
            permission_key TEXT
            ${phase2 ? ", effect TEXT" : ""}
        );
        ${phase2 ? `CREATE TABLE GuildStaffPermissionDefaultsV2 (
            guild_id TEXT,
            permission_key TEXT,
            effect TEXT
        );` : ""}
    `);
    db.prepare("INSERT INTO Guilds (id) VALUES ('guild-a')").run();
    db.prepare(`
        INSERT INTO GuildSettingsV2 (guild_id, validation_channel_id)
        VALUES ('guild-a', 'validation')
    `).run();
    return db;
}

function member(id, { roles = [], bot = false, administrator = false } = {}) {
    return {
        id,
        user: { id, bot },
        roles: { cache: new Map(roles.map(roleId => [roleId, {}])) },
        permissions: {
            has: permission => administrator
                && permission === PermissionFlagsBits.Administrator
        }
    };
}

function fakeGuild({
    members,
    viewable = new Set(),
    channelCached = true,
    fetchFails = false
}) {
    const calls = { memberFetch: 0, channelFetch: 0, permissionsFor: 0 };
    const channel = {
        permissionsFor(candidate) {
            calls.permissionsFor += 1;
            return {
                has: permission => permission === PermissionFlagsBits.ViewChannel
                    && viewable.has(candidate.id)
            };
        }
    };
    return {
        calls,
        guild: {
            id: "guild-a",
            ownerId: "owner",
            channels: {
                cache: new Map(channelCached ? [["validation", channel]] : []),
                fetch: () => {
                    calls.channelFetch += 1;
                    throw new Error("forbidden");
                }
            },
            members: {
                cache: members,
                async fetch() {
                    calls.memberFetch += 1;
                    if (fetchFails) throw new Error("members unavailable");
                    return members;
                }
            }
        }
    };
}

function config(snapshot) {
    return snapshot.guilds[0];
}

test("2C.5c lit un schéma Phase 1 sans effect/defaults comme allow legacy", () => {
    const db = createDatabase();
    db.prepare(`
        INSERT INTO GuildStaffRolePermissionsV2
        VALUES ('guild-a', 'role-a', 'assets')
    `).run();
    db.prepare(`
        INSERT INTO GuildStaffUserPermissionsV2
        VALUES ('guild-a', 'user-a', 'modules')
    `).run();
    const snapshot = preflight.loadDatabaseSnapshot(db);
    assert.deepEqual(snapshot.schema, {
        roleEffect: false,
        userEffect: false,
        defaults: false
    });
    assert.equal(snapshot.roles[0].effect, "allow");
    assert.equal(snapshot.users[0].effect, "allow");
    assert.deepEqual(snapshot.defaults, []);
    assert.equal(config(snapshot).flagEnabled, true);
    db.close();
});

test("2C.5c lit effect NULL/allow/deny et defaults Phase 2", () => {
    const db = createDatabase({ phase2: true });
    db.prepare(`INSERT INTO GuildStaffRolePermissionsV2
        VALUES ('guild-a', 'role-a', 'assets', 'deny')`).run();
    db.prepare(`INSERT INTO GuildStaffUserPermissionsV2
        VALUES ('guild-a', 'user-a', 'assets', NULL)`).run();
    db.prepare(`INSERT INTO GuildStaffPermissionDefaultsV2
        VALUES ('guild-a', 'modules', 'allow')`).run();
    const snapshot = preflight.loadDatabaseSnapshot(db);
    assert.equal(snapshot.roles[0].effect, "deny");
    assert.equal(snapshot.users[0].effect, "allow");
    assert.equal(snapshot.defaults[0].effect, "allow");
    assert.equal(preflight.evaluateStrictWithoutBridge({
        permission: "assets", write: true,
        userRows: snapshot.users,
        roleRows: snapshot.roles,
        defaultRows: snapshot.defaults
    }).reason, "USER_ALLOW");
    assert.equal(preflight.evaluateStrictWithoutBridge({
        permission: "modules", write: true,
        userRows: [], roleRows: [], defaultRows: snapshot.defaults
    }).reason, "GUILD_DEFAULT_ALLOW");
    db.close();
});

test("2C.5c2 mesure characters bridge-only sans exposer Assets/Modules", async () => {
    const db = createDatabase({ phase2: true });
    const snapshot = preflight.loadDatabaseSnapshot(db);
    const manageGuildOnly = member("manager");
    manageGuildOnly.permissions.has = permission =>
        permission === PermissionFlagsBits.ManageGuild;
    const exposed = member("exposed");
    const exposedBot = member("bot", { bot: true });
    const { guild, calls } = fakeGuild({
        members: new Map([
            ["manager", manageGuildOnly],
            ["exposed", exposed],
            ["bot", exposedBot]
        ]),
        viewable: new Set(["exposed", "bot"])
    });
    const report = await preflight.auditGuild({
        config: config(snapshot), guild, snapshot, PermissionFlagsBits
    });
    assert.equal(report.qualified_human_count, 1);
    assert.equal(report.qualified_bot_count, 1);
    assert.equal(report.bot_member_count, 1);
    assert.equal(report.bridge_only_member_count, 1);
    assert.equal(report.bridge_only_characters_read_count, 1);
    assert.equal(report.bridge_only_characters_write_count, 1);
    assert.equal(report.bridge_only_assets_read_count, 0);
    assert.equal(report.bridge_only_assets_write_count, 0);
    assert.equal(report.bridge_only_modules_write_count, 0);
    assert.equal(report.bridge_only_non_characters_count, 0);
    assert.equal(calls.memberFetch, 1);
    assert.equal(calls.channelFetch, 0);
    db.close();
});

test("2C.5c exclut roots, user deny et role deny des expositions bridge-only", async () => {
    const db = createDatabase({ phase2: true });
    db.prepare(`INSERT INTO GuildStaffUserPermissionsV2
        VALUES ('guild-a', 'user-deny', 'assets', 'deny')`).run();
    db.prepare(`INSERT INTO GuildStaffRolePermissionsV2
        VALUES ('guild-a', 'role-deny', 'assets', 'deny')`).run();
    db.prepare(`INSERT INTO GuildStaffUserPermissionsV2
        VALUES ('guild-a', 'user-allow', 'assets', 'allow')`).run();
    db.prepare(`INSERT INTO GuildStaffRolePermissionsV2
        VALUES ('guild-a', 'role-allow', 'assets', 'allow')`).run();
    const snapshot = preflight.loadDatabaseSnapshot(db);
    const members = new Map([
        ["owner", member("owner")],
        ["admin", member("admin", { administrator: true })],
        ["user-deny", member("user-deny")],
        ["role-user", member("role-user", { roles: ["role-deny"] })],
        ["user-allow", member("user-allow")],
        ["role-allowed", member("role-allowed", { roles: ["role-allow"] })]
    ]);
    const { guild } = fakeGuild({
        members,
        viewable: new Set(members.keys())
    });
    const report = await preflight.auditGuild({
        config: config(snapshot), guild, snapshot, PermissionFlagsBits
    });
    assert.equal(report.qualified_root_count, 2);
    assert.equal(report.qualified_with_user_deny, 1);
    assert.equal(report.qualified_with_role_deny, 1);
    assert.equal(report.qualified_with_user_allow, 1);
    assert.equal(report.qualified_with_role_allow, 1);
    assert.equal(report.bridge_only_assets_write_count, 0);
    db.close();
});

test("2C.5c respecte flag OFF, cache miss et absence de fetch salon", async () => {
    const db = createDatabase();
    db.prepare(`
        INSERT INTO GuildStaffPermissionSettingsV2
        VALUES ('guild-a', 0)
    `).run();
    let snapshot = preflight.loadDatabaseSnapshot(db);
    const visible = member("visible");
    let fake = fakeGuild({
        members: new Map([["visible", visible]]),
        viewable: new Set(["visible"])
    });
    let report = await preflight.auditGuild({
        config: config(snapshot), guild: fake.guild,
        snapshot, PermissionFlagsBits
    });
    assert.equal(report.qualified_human_count, 0);
    assert.equal(fake.calls.permissionsFor, 0);

    db.prepare(`
        UPDATE GuildStaffPermissionSettingsV2
        SET validation_channel_grants_access = 1
    `).run();
    snapshot = preflight.loadDatabaseSnapshot(db);
    fake = fakeGuild({
        members: new Map([["visible", visible]]),
        viewable: new Set(["visible"]),
        channelCached: false
    });
    report = await preflight.auditGuild({
        config: config(snapshot), guild: fake.guild,
        snapshot, PermissionFlagsBits
    });
    assert.equal(report.validation_channel_cached, false);
    assert.equal(report.qualified_human_count, 0);
    assert.equal(fake.calls.channelFetch, 0);
    db.close();
});

test("2C.5c marque explicitement un inventaire membres incomplet", async () => {
    const db = createDatabase();
    const snapshot = preflight.loadDatabaseSnapshot(db);
    const fake = fakeGuild({
        members: new Map(),
        fetchFails: true,
        viewable: new Set()
    });
    const report = await preflight.auditGuild({
        config: config(snapshot), guild: fake.guild,
        snapshot, PermissionFlagsBits
    });
    assert.equal(report.members_complete, false);
    assert.equal(report.member_fetch_failed, true);
    assert.equal(report.exposure_status, "INCOMPLETE");
    assert.equal(preflight.globalSummary([report]).incomplete_guild_audits, 1);
    db.close();
});

test("2C.5c stoppe sur un schéma critique absent", () => {
    const db = new Database(":memory:");
    assert.throws(
        () => preflight.inspectSchema(db),
        error => error.code === "SCHEMA_WARNING"
    );
    db.close();
});

test("2C.5c garde le script exécutable strictement sans mutation", () => {
    const source = fs.readFileSync(path.join(
        __dirname,
        "../scripts/audit-validation-bridge-preflight.cjs"
    ), "utf8");
    for (const forbidden of [
        /\bINSERT\b/i, /\bUPDATE\b/i, /\bDELETE\b/i, /\bALTER\b/i,
        /CREATE\s+TABLE/i, /\bDROP\b/i, /\.send\s*\(/,
        /roles\.add\s*\(/, /roles\.remove\s*\(/
    ]) assert.doesNotMatch(source, forbidden);
    assert.match(source, /readonly:\s*true/);
    assert.match(source, /fileMustExist:\s*true/);
    assert.match(source, /query_only\s*=\s*ON/);
    assert.doesNotMatch(source, /MessageContent|GuildMessages|Presence/);
    assert.doesNotMatch(source, /channels\.fetch|channel\.fetch/);
});
