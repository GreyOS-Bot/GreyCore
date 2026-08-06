const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createIsolatedDatabase
} = require("./helpers/isolatedDatabase");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "le schéma conserve le mode maintenance par serveur",
    context => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });

        context.after(
            () => isolated.cleanup()
        );

        const columns =
            isolated.database
                .prepare(
                    "PRAGMA table_info(GuildSettingsV2)"
                )
                .all()
                .map(column => column.name);

        assert.ok(
            columns.includes(
                "maintenance_enabled"
            )
        );
        assert.ok(
            columns.includes(
                "maintenance_message"
            )
        );
    }
);

test(
    "la maintenance bloque les interfaces mais laisse sa commande accessible",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/managers/GuildSettingsV2Manager.js",
            {
                getMaintenance: () => ({
                    enabled: true,
                    message:
                        "Mise à jour en cours."
                })
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                deferPrivate:
                    async interaction => {
                        interaction.deferred = true;
                        calls.push("defer");
                    }
            }
        );

        const servicePath = require.resolve(
            "../src/v2/services/MaintenanceModeService"
        );
        delete require.cache[servicePath];

        const service = require(
            "../src/v2/services/MaintenanceModeService"
        );

        const interaction = {
            guildId: "guild",
            commandName: "personnage",
            isAutocomplete: () => false,
            editReply: async payload =>
                calls.push(payload)
        };

        assert.equal(
            await service.blockInteraction(
                interaction
            ),
            true
        );
        assert.equal(calls[0], "defer");
        assert.match(
            calls[1].content,
            /Mise à jour en cours/
        );

        assert.equal(
            await service.blockInteraction({
                ...interaction,
                commandName: "maintenance"
            }),
            false
        );
    }
);

test(
    "la commande maintenance est réservée au staff et active la pause",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/managers/GuildSettingsV2Manager.js",
            {
                setMaintenance: (
                    guildId,
                    settings
                ) => calls.push([
                    guildId,
                    settings
                ]),
                getMaintenance: () => ({
                    enabled: false,
                    message: null
                })
            }
        );
        stubModule(
            "src/v2/core/policies/ValidationStaffPolicy.js",
            {
                canManageServerTools: () => true
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyError: async () => {},
                replyPrivate:
                    async (_interaction, content) =>
                        calls.push(content)
            }
        );

        const commandPath = require.resolve(
            "../src/commands/maintenance"
        );
        delete require.cache[commandPath];

        const command = require(
            "../src/commands/maintenance"
        );

        await command.execute({
            guildId: "guild",
            options: {
                getSubcommand: () => "activer",
                getString: () =>
                    "Correction en cours."
            }
        });

        assert.deepEqual(
            calls[0],
            [
                "guild",
                {
                    enabled: true,
                    message:
                        "Correction en cours."
                }
            ]
        );
        assert.match(
            calls[1],
            /Maintenance activée/
        );
    }
);
