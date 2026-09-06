const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { stubModule } = require("./helpers/moduleStub");

function loadCommand({ canRead = false, canWrite = false, active = false } = {}) {
    const calls = {
        read: [],
        write: [],
        getMaintenance: 0,
        setMaintenance: [],
        errors: [],
        replies: []
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
    stubModule("src/v2/managers/GuildSettingsV2Manager.js", {
        getMaintenance: () => {
            calls.getMaintenance += 1;
            return {
                enabled: active,
                message: active ? "Maintenance active" : null
            };
        },
        setMaintenance: (guildId, configuration) => {
            calls.setMaintenance.push([guildId, configuration]);
        }
    });
    stubModule("src/v2/core/services/InteractionResponseService.js", {
        replyError: (_interaction, message) => {
            calls.errors.push(message);
        },
        replyPrivate: (_interaction, message) => {
            calls.replies.push(message);
        }
    });

    const commandPath = require.resolve("../src/commands/maintenance");
    delete require.cache[commandPath];
    return { command: require(commandPath), calls };
}

function interaction(action) {
    return {
        guildId: "guild-a",
        options: {
            getSubcommand: () => action,
            getString: () => "Intervention en cours"
        }
    };
}

test("2C.6c applique settings/read au statut avant toute lecture", async () => {
    const denied = loadCommand();
    await denied.command.execute(interaction("statut"));
    assert.deepEqual(denied.calls.read, ["settings"]);
    assert.deepEqual(denied.calls.write, []);
    assert.equal(denied.calls.getMaintenance, 0);
    assert.deepEqual(denied.calls.setMaintenance, []);
    assert.equal(denied.calls.errors.length, 1);

    const allowed = loadCommand({ canRead: true, active: true });
    await allowed.command.execute(interaction("statut"));
    assert.equal(allowed.calls.getMaintenance, 1);
    assert.match(allowed.calls.replies[0], /Maintenance active/);
});

test("2C.6c applique settings/write aux mutations avant tout effet", async () => {
    for (const action of ["activer", "desactiver"]) {
        const denied = loadCommand({ canRead: true });
        await denied.command.execute(interaction(action));
        assert.deepEqual(denied.calls.write, ["settings"], action);
        assert.equal(denied.calls.getMaintenance, 0, action);
        assert.deepEqual(denied.calls.setMaintenance, [], action);
        assert.equal(denied.calls.errors.length, 1, action);
    }
});

test("2C.6c conserve les mutations autorisées et leur idempotence métier", async () => {
    const enable = loadCommand({ canWrite: true, active: true });
    await enable.command.execute(interaction("activer"));
    assert.deepEqual(enable.calls.setMaintenance, [[
        "guild-a",
        { enabled: true, message: "Intervention en cours" }
    ]]);

    const disable = loadCommand({ canWrite: true, active: true });
    await disable.command.execute(interaction("desactiver"));
    assert.deepEqual(disable.calls.setMaintenance, [[
        "guild-a",
        { enabled: false, message: null }
    ]]);
});

test("2C.6c laisse read_only consulter mais jamais muter", async () => {
    const status = loadCommand({ canRead: true, canWrite: false, active: true });
    await status.command.execute(interaction("statut"));
    assert.equal(status.calls.getMaintenance, 1);

    for (const action of ["activer", "desactiver"]) {
        const mutation = loadCommand({ canRead: true, canWrite: false, active: true });
        await mutation.command.execute(interaction(action));
        assert.deepEqual(mutation.calls.setMaintenance, []);
        assert.equal(mutation.calls.errors.length, 1);
    }
});

test("2C.6c ne conserve aucune autorité legacy dans /maintenance", () => {
    const source = fs.readFileSync(
        path.join(__dirname, "../src/commands/maintenance.js"),
        "utf8"
    );
    assert.match(source, /AdministrativePermissionAccessService/);
    assert.doesNotMatch(source, /ValidationStaffPolicy|canManageServerTools|canReview|StaffCommandAccessService|GuildManagementPolicy|ManageGuild|allowValidationBridge/);
});
