const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la configuration des journaux vérifie immédiatement que le bot peut écrire dans le salon",
    async () => {
        const sent = [];
        const saved = [];
        let replyPayload = null;

        stubModule(
            "src/managers/ServerConfigManager.js",
            {
                set: () => null,
                get: () => null
            }
        );
        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    guildSettings: {
                        setErrorLogChannel: (
                            guildId,
                            channelId
                        ) => saved.push([
                            guildId,
                            channelId
                        ])
                    }
                }
            }
        );
        stubModule(
            "src/v2/repositories/GuildRepository.js",
            {
                ensure: () => null
            }
        );
        stubModule(
            "src/v2/interactions/settings/GuildModuleSettingsHandler.js",
            {
                open: () => null
            }
        );
        stubModule(
            "src/v2/core/policies/GuildManagementPolicy.js",
            {
                canManage: () => true
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyError: () => null
            }
        );

        const commandPath =
            require.resolve(
                "../src/commands/config"
            );

        delete require.cache[
            commandPath
        ];

        const command =
            require("../src/commands/config");

        const channel = {
            id: "errors",
            send: async payload =>
                sent.push(payload),
            toString: () => "<#errors>"
        };

        await command.execute({
            guild: {
                id: "guild",
                name: "GreyOS"
            },
            options: {
                getSubcommand: () => "journaux",
                getChannel: () => channel,
                getBoolean: () => false
            },
            reply: async payload => {
                replyPayload = payload;
            }
        });

        assert.equal(
            sent.length,
            1
        );

        assert.equal(
            sent[0].embeds[0]
                .toJSON()
                .title,
            "✅ Journal d’erreurs GreyCore activé"
        );

        assert.deepEqual(
            saved,
            [["guild", "errors"]]
        );

        assert.match(
            replyPayload.content,
            /message de test/
        );
    }
);
