#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { createRequire } = require("node:module");

const KNOWN_PERMISSIONS = Object.freeze([
    "characters", "scenes", "phone", "bank", "assets",
    "relationships", "universe", "entities", "automations",
    "modules", "logs", "settings", "read_only"
]);

function tableExists(db, tableName) {
    return Boolean(db.prepare(`
        SELECT 1 FROM sqlite_master
        WHERE type = 'table' AND name = ?
    `).get(tableName));
}

function columnNames(db, tableName) {
    if (!tableExists(db, tableName)) return new Set();
    return new Set(db.pragma(`table_info(${tableName})`).map(row => row.name));
}

function normalizedEffect(effect, effectSupported) {
    if (!effectSupported || effect == null) return "allow";
    return effect === "deny" ? "deny" : "allow";
}

function inspectSchema(db) {
    const required = [
        "Guilds",
        "GuildSettingsV2",
        "GuildStaffPermissionSettingsV2",
        "GuildStaffRolePermissionsV2",
        "GuildStaffUserPermissionsV2"
    ];
    const missing = required.filter(tableName => !tableExists(db, tableName));
    if (missing.length) {
        const error = new Error(`SCHEMA_WARNING_MISSING:${missing.join(",")}`);
        error.code = "SCHEMA_WARNING";
        throw error;
    }
    return Object.freeze({
        roleEffect: columnNames(
            db, "GuildStaffRolePermissionsV2"
        ).has("effect"),
        userEffect: columnNames(
            db, "GuildStaffUserPermissionsV2"
        ).has("effect"),
        defaults: tableExists(db, "GuildStaffPermissionDefaultsV2")
    });
}

function loadDatabaseSnapshot(db) {
    const schema = inspectSchema(db);
    const guildRows = db.prepare(`
        SELECT
            guild.id AS guild_id,
            settings.validation_channel_id,
            permission_settings.validation_channel_grants_access
        FROM Guilds AS guild
        LEFT JOIN GuildSettingsV2 AS settings
            ON settings.guild_id = guild.id
        LEFT JOIN GuildStaffPermissionSettingsV2 AS permission_settings
            ON permission_settings.guild_id = guild.id
        ORDER BY guild.id
    `).all();
    const roleEffect = schema.roleEffect ? ", effect" : "";
    const userEffect = schema.userEffect ? ", effect" : "";
    const roles = db.prepare(`
        SELECT guild_id, role_id, permission_key${roleEffect}
        FROM GuildStaffRolePermissionsV2
    `).all().map(row => ({
        guildId: String(row.guild_id),
        roleId: String(row.role_id),
        permission: row.permission_key,
        effect: normalizedEffect(row.effect, schema.roleEffect)
    }));
    const users = db.prepare(`
        SELECT guild_id, discord_user_id, permission_key${userEffect}
        FROM GuildStaffUserPermissionsV2
    `).all().map(row => ({
        guildId: String(row.guild_id),
        userId: String(row.discord_user_id),
        permission: row.permission_key,
        effect: normalizedEffect(row.effect, schema.userEffect)
    }));
    const defaults = schema.defaults
        ? db.prepare(`
            SELECT guild_id, permission_key, effect
            FROM GuildStaffPermissionDefaultsV2
        `).all().map(row => ({
            guildId: String(row.guild_id),
            permission: row.permission_key,
            effect: normalizedEffect(row.effect, true)
        }))
        : [];
    return Object.freeze({
        schema,
        guilds: guildRows.map(row => Object.freeze({
            guildId: String(row.guild_id),
            flagEnabled: row.validation_channel_grants_access == null
                ? true
                : Number(row.validation_channel_grants_access) === 1,
            channelId: String(row.validation_channel_id || "").trim() || null
        })),
        roles: Object.freeze(roles),
        users: Object.freeze(users),
        defaults: Object.freeze(defaults)
    });
}

function assignmentFor(rows, permission) {
    return rows.find(row => row.permission === permission) || null;
}

function evaluateStrictWithoutBridge({
    permission,
    write,
    userRows,
    roleRows,
    defaultRows
}) {
    const specific = evaluateSpecific({
        permission, userRows, roleRows, defaultRows
    });
    if (specific) return specific;
    if (!write && permission !== "read_only") {
        const readOnly = evaluateSpecific({
            permission: "read_only", userRows, roleRows, defaultRows
        });
        if (readOnly) {
            return Object.freeze({
                allowed: readOnly.allowed,
                reason: readOnly.allowed ? "READ_ONLY" : "READ_ONLY_DENY"
            });
        }
    }
    return Object.freeze({ allowed: false, reason: "IMPLICIT_DENY" });
}

function evaluateSpecific({ permission, userRows, roleRows, defaultRows }) {
    const user = assignmentFor(userRows, permission);
    if (user) {
        return Object.freeze({
            allowed: user.effect !== "deny",
            reason: user.effect === "deny" ? "USER_DENY" : "USER_ALLOW"
        });
    }
    const roles = roleRows.filter(row => row.permission === permission);
    if (roles.some(row => row.effect === "deny")) {
        return Object.freeze({ allowed: false, reason: "ROLE_DENY" });
    }
    if (roles.length) {
        return Object.freeze({ allowed: true, reason: "ROLE_ALLOW" });
    }
    const fallback = assignmentFor(defaultRows, permission);
    if (fallback) {
        return Object.freeze({
            allowed: fallback.effect === "allow",
            reason: fallback.effect === "allow"
                ? "GUILD_DEFAULT_ALLOW"
                : "GUILD_DEFAULT_DENY"
        });
    }
    return null;
}

function emptyPermissionExposure() {
    return Object.fromEntries(KNOWN_PERMISSIONS.map(permission => [
        permission,
        { bridge_only_read_count: 0, bridge_only_write_count: 0 }
    ]));
}

function memberRoleIds(member) {
    const cache = member?.roles?.cache;
    return cache?.keys ? new Set([...cache.keys()].map(String)) : new Set();
}

function isAdministrator(member, PermissionFlagsBits) {
    return Boolean(member?.permissions?.has?.(
        PermissionFlagsBits.Administrator
    ));
}

async function auditGuild({
    config,
    guild,
    snapshot,
    PermissionFlagsBits
}) {
    const report = {
        guild_id: config.guildId,
        guild_available: Boolean(guild),
        flag_enabled: config.flagEnabled,
        validation_channel_configured: Boolean(config.channelId),
        validation_channel_cached: false,
        members_complete: false,
        member_fetch_failed: false,
        exposure_status: "INCOMPLETE",
        human_member_count: 0,
        bot_member_count: 0,
        qualified_human_count: 0,
        qualified_bot_count: 0,
        qualified_root_count: 0,
        bridge_only_member_count: 0,
        bridge_only_characters_read_count: 0,
        bridge_only_characters_write_count: 0,
        bridge_only_non_characters_count: 0,
        qualified_with_user_allow: 0,
        qualified_with_role_allow: 0,
        qualified_with_user_deny: 0,
        qualified_with_role_deny: 0,
        bridge_only_assets_read_count: 0,
        bridge_only_assets_write_count: 0,
        bridge_only_modules_write_count: 0,
        bridge_only_by_permission: emptyPermissionExposure()
    };
    if (!guild) return report;

    const channel = config.channelId
        ? guild.channels?.cache?.get?.(config.channelId) || null
        : null;
    report.validation_channel_cached = Boolean(channel);

    let members;
    try {
        members = await guild.members.fetch();
        report.members_complete = true;
        report.exposure_status = "COMPLETE";
    } catch {
        report.member_fetch_failed = true;
        members = guild.members?.cache || new Map();
    }

    const guildRoles = snapshot.roles.filter(row =>
        row.guildId === config.guildId
        && KNOWN_PERMISSIONS.includes(row.permission)
    );
    const guildUsers = snapshot.users.filter(row =>
        row.guildId === config.guildId
        && KNOWN_PERMISSIONS.includes(row.permission)
    );
    const guildDefaults = snapshot.defaults.filter(row =>
        row.guildId === config.guildId
        && KNOWN_PERMISSIONS.includes(row.permission)
    );

    for (const member of members.values()) {
        const bot = Boolean(member.user?.bot);
        if (bot) report.bot_member_count += 1;
        else report.human_member_count += 1;

        const root = String(member.id) === String(guild.ownerId)
            || isAdministrator(member, PermissionFlagsBits);
        let qualified = false;
        if (config.flagEnabled && channel && member) {
            try {
                qualified = Boolean(channel.permissionsFor(member)?.has?.(
                    PermissionFlagsBits.ViewChannel
                ));
            } catch {
                qualified = false;
            }
        }
        if (!qualified) continue;
        if (root) {
            report.qualified_root_count += 1;
            continue;
        }
        if (bot) {
            report.qualified_bot_count += 1;
            continue;
        }
        report.qualified_human_count += 1;

        const userRows = guildUsers.filter(row =>
            row.userId === String(member.id)
        );
        const roleIds = memberRoleIds(member);
        const roleRows = guildRoles.filter(row => roleIds.has(row.roleId));
        if (userRows.some(row => row.effect === "allow")) {
            report.qualified_with_user_allow += 1;
        }
        if (userRows.some(row => row.effect === "deny")) {
            report.qualified_with_user_deny += 1;
        }
        if (roleRows.some(row => row.effect === "allow")) {
            report.qualified_with_role_allow += 1;
        }
        if (roleRows.some(row => row.effect === "deny")) {
            report.qualified_with_role_deny += 1;
        }

        let memberBridgeOnly = false;
        for (const permission of KNOWN_PERMISSIONS) {
            for (const write of [false, true]) {
                const withoutBridge = evaluateStrictWithoutBridge({
                    permission,
                    write,
                    userRows,
                    roleRows,
                    defaultRows: guildDefaults
                });
                const blockedAboveBridge = [
                    "USER_DENY", "ROLE_DENY"
                ].includes(withoutBridge.reason);
                const bridgeEligible = permission === "characters";
                const bridgeOnly = bridgeEligible
                    && !withoutBridge.allowed
                    && !blockedAboveBridge;
                if (!bridgeOnly) continue;
                memberBridgeOnly = true;
                const key = write
                    ? "bridge_only_write_count"
                    : "bridge_only_read_count";
                report.bridge_only_by_permission[permission][key] += 1;
            }
        }
        if (memberBridgeOnly) report.bridge_only_member_count += 1;
    }

    report.bridge_only_assets_read_count =
        report.bridge_only_by_permission.assets.bridge_only_read_count;
    report.bridge_only_assets_write_count =
        report.bridge_only_by_permission.assets.bridge_only_write_count;
    report.bridge_only_modules_write_count =
        report.bridge_only_by_permission.modules.bridge_only_write_count;
    report.bridge_only_characters_read_count =
        report.bridge_only_by_permission.characters.bridge_only_read_count;
    report.bridge_only_characters_write_count =
        report.bridge_only_by_permission.characters.bridge_only_write_count;
    report.bridge_only_non_characters_count = KNOWN_PERMISSIONS
        .filter(permission => permission !== "characters")
        .reduce((total, permission) => total
            + report.bridge_only_by_permission[permission].bridge_only_read_count
            + report.bridge_only_by_permission[permission].bridge_only_write_count, 0);
    return report;
}

function globalSummary(reports) {
    const sum = key => reports.reduce((total, report) =>
        total + Number(report[key] || 0), 0);
    return {
        total_guilds_audited: reports.length,
        total_qualified_humans: sum("qualified_human_count"),
        total_bridge_only_humans: sum("bridge_only_member_count"),
        total_bridge_only_characters_read: sum(
            "bridge_only_characters_read_count"
        ),
        total_bridge_only_characters_write: sum(
            "bridge_only_characters_write_count"
        ),
        total_bridge_only_assets_write: sum(
            "bridge_only_assets_write_count"
        ),
        total_bridge_only_modules_write: sum(
            "bridge_only_modules_write_count"
        ),
        total_bridge_only_non_characters: sum(
            "bridge_only_non_characters_count"
        ),
        incomplete_guild_audits: reports.filter(report =>
            report.exposure_status !== "COMPLETE"
        ).length
    };
}

async function runAudit({ db, client, PermissionFlagsBits }) {
    const snapshot = loadDatabaseSnapshot(db);
    const reports = [];
    for (const config of snapshot.guilds) {
        reports.push(await auditGuild({
            config,
            guild: client.guilds.cache.get(config.guildId) || null,
            snapshot,
            PermissionFlagsBits
        }));
    }
    return {
        schema: snapshot.schema,
        guilds: reports,
        summary: globalSummary(reports)
    };
}

async function main() {
    const appRoot = path.resolve(process.env.GREYCORE_APP_ROOT || process.cwd());
    const appRequire = createRequire(path.join(appRoot, "package.json"));
    appRequire("dotenv").config({ path: path.join(appRoot, ".env") });
    const databasePath = String(process.env.GREYCORE_DATABASE_PATH || "").trim();
    const token = String(process.env.TOKEN || "").trim();
    if (!databasePath) {
        const error = new Error("Database path required");
        error.code = "GREYCORE_DATABASE_PATH_REQUIRED";
        throw error;
    }
    if (!token) {
        const error = new Error("Discord token required");
        error.code = "DISCORD_TOKEN_REQUIRED";
        throw error;
    }

    const Database = appRequire("better-sqlite3");
    const {
        Client, GatewayIntentBits, PermissionFlagsBits
    } = appRequire("discord.js");
    const db = new Database(path.resolve(databasePath), {
        readonly: true,
        fileMustExist: true
    });
    db.pragma("query_only = ON");
    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
    });
    try {
        await client.login(token);
        const result = await runAudit({ db, client, PermissionFlagsBits });
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        const modelExposure = result.summary.total_bridge_only_assets_write
            + result.summary.total_bridge_only_modules_write
            + result.summary.total_bridge_only_non_characters;
        if (modelExposure > 0) {
            const error = new Error("AUDIT_MODEL_ERROR");
            error.code = "AUDIT_MODEL_ERROR";
            throw error;
        }
        if (result.summary.incomplete_guild_audits > 0) process.exitCode = 2;
    } finally {
        client.destroy();
        db.close();
    }
}

if (require.main === module) {
    main().catch(error => {
        const code = error?.code || "AUDIT_FAILED";
        process.stderr.write(`Validation bridge preflight failed: ${code}\n`);
        process.exitCode = 1;
    });
}

module.exports = {
    KNOWN_PERMISSIONS,
    inspectSchema,
    loadDatabaseSnapshot,
    evaluateStrictWithoutBridge,
    auditGuild,
    globalSummary,
    runAudit
};
