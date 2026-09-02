const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { stubModule } = require("./helpers/moduleStub");

function loadConfig({ canRead = false, canWrite = false } = {}) {
    const calls = {
        read: [],
        write: [],
        ensure: 0,
        open: 0,
        errors: [],
        reads: 0,
        writes: 0
    };

    stubModule("src/v2/core/services/AdministrativePermissionAccessService.js", {
        canRead: (_interaction, permission) => {
            calls.read.push(permission);
            return canRead;
        },
        canWrite: (_interaction, permission) => {
            calls.write.push(permission);
            return canWrite;
        }
    });
    stubModule("src/v2/repositories/GuildRepository.js", {
        ensure: () => { calls.ensure += 1; }
    });
    stubModule("src/v2/interactions/settings/GuildModuleSettingsHandler.js", {
        open: () => { calls.open += 1; }
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: (_interaction, message) => {
            calls.errors.push(message);
        }
    });
    stubModule("src/v2/index.js", {
        managers: {
            characterApprovalAutomation: {
                getConfiguration: () => {
                    calls.reads += 1;
                    return null;
                }
            },
            guildSettings: new Proxy({}, {
                get: () => () => { calls.writes += 1; }
            }),
            sceneAssistant: new Proxy({}, {
                get: () => () => { calls.writes += 1; }
            })
        }
    });

    const commandPath = require.resolve("../src/commands/config");
    delete require.cache[commandPath];
    return { command: require("../src/commands/config"), calls };
}

function interaction(subcommand) {
    const replies = [];
    return {
        guildId: "guild-a",
        guild: { id: "guild-a", name: "Guild A" },
        options: {
            getSubcommand: () => subcommand,
            getString: () => "value",
            getBoolean: () => false,
            getInteger: () => null,
            getRole: () => null,
            getChannel: () => null
        },
        reply: payload => {
            replies.push(payload);
            return payload;
        },
        replies
    };
}

test("2C.6b applique la matrice stricte avant ensure et tout effet", async () => {
    const expected = new Map([
        ["validation", ["write", "settings"]],
        ["journaux", ["write", "logs"]],
        ["automatisation-voir", ["read", "automations"]],
        ["automatisation", ["write", "automations"]],
        ["automatisation-desactiver", ["write", "automations"]],
        ["scenes", ["write", "scenes"]],
        ["limite-pj", ["write", "settings"]],
        ["modules", ["read", "modules"]]
    ]);

    for (const [subcommand, [mode, permission]] of expected) {
        const { command, calls } = loadConfig();
        await command.execute(interaction(subcommand));
        assert.deepEqual(calls[mode], [permission], subcommand);
        assert.equal(calls.ensure, 0, subcommand);
        assert.equal(calls.open, 0, subcommand);
        assert.equal(calls.reads, 0, subcommand);
        assert.equal(calls.writes, 0, subcommand);
        assert.equal(calls.errors.length, 1, subcommand);
    }
});

test("2C.6b neutralise set et get sans autorisation, DB ou effet", async () => {
    for (const subcommand of ["set", "get"]) {
        const { command, calls } = loadConfig();
        const target = interaction(subcommand);
        await command.execute(target);
        assert.equal(calls.ensure, 0);
        assert.deepEqual(calls.read, []);
        assert.deepEqual(calls.write, []);
        assert.equal(calls.reads, 0);
        assert.equal(calls.writes, 0);
        assert.match(target.replies[0].content, /désormais gérés depuis `\/staff`/);
        assert.equal(target.replies[0].ephemeral, true);
    }
});

test("2C.6b réserve read_only aux deux consultations", async () => {
    for (const subcommand of ["automatisation-voir", "modules"]) {
        const { command, calls } = loadConfig({ canRead: true });
        await command.execute(interaction(subcommand));
        assert.equal(calls.ensure, 1);
        assert.equal(calls.errors.length, 0);
    }

    for (const subcommand of [
        "validation",
        "journaux",
        "automatisation",
        "automatisation-desactiver",
        "scenes",
        "limite-pj"
    ]) {
        const { command, calls } = loadConfig({ canRead: true, canWrite: false });
        await command.execute(interaction(subcommand));
        assert.equal(calls.ensure, 0, subcommand);
        assert.equal(calls.errors.length, 1, subcommand);
    }
});

test("2C.6b retire toutes les autorités legacy de /config", () => {
    const source = fs.readFileSync(
        path.join(__dirname, "../src/commands/config/index.js"),
        "utf8"
    );
    assert.doesNotMatch(source, /ValidationStaffPolicy|canManageServerTools|StaffCommandAccessService|GuildManagementPolicy|allowValidationBridge|ManageGuild/);
    assert.match(source, /AdministrativePermissionAccessService/);
});

function loadModuleHandler({ canRead = false, canWrite = false } = {}) {
    const calls = { reads: 0, writes: 0, errors: 0, updates: 0 };
    stubModule("src/v2/core/services/AdministrativePermissionAccessService.js", {
        canRead: () => canRead,
        canWrite: () => canWrite
    });
    stubModule("src/v2/managers/GuildModuleV2Manager.js", {
        getConfiguration: () => {
            calls.reads += 1;
            return [];
        },
        getModule: () => ({ key: "phone" }),
        isEnabled: () => {
            calls.reads += 1;
            return true;
        },
        setEnabled: () => { calls.writes += 1; }
    });
    stubModule("src/v2/views/settings/GuildModulesView.js", { build: value => value });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: () => { calls.errors += 1; },
        replyPrivate: () => null
    });
    const handlerPath = require.resolve(
        "../src/v2/interactions/settings/GuildModuleSettingsHandler"
    );
    delete require.cache[handlerPath];
    return { handler: require(handlerPath), calls };
}

test("2C.6b revalide le toggle forgé en modules/write avant lecture ou mutation", async () => {
    const denied = loadModuleHandler({ canRead: true, canWrite: false });
    await denied.handler.toggle({ guildId: "guild-a", values: ["phone"] });
    assert.deepEqual(denied.calls, {
        reads: 0,
        writes: 0,
        errors: 1,
        updates: 0
    });

    const allowed = loadModuleHandler({ canWrite: true });
    await allowed.handler.toggle({
        guildId: "guild-a",
        values: ["phone"],
        update: () => { allowed.calls.updates += 1; }
    });
    assert.equal(allowed.calls.writes, 1);
    assert.equal(allowed.calls.updates, 1);
});
