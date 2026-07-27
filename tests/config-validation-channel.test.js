const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la configuration peut créer et enregistrer un salon de validation privé",
    async () => {
        let createdChannelOptions = null;
        let validationChannelId = null;
        let ensuredGuild = null;
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
                        setValidationChannel: (
                            guildId,
                            channelId
                        ) => {
                            validationChannelId = [
                                guildId,
                                channelId
                            ];
                        }
                    }
                }
            }
        );

        stubModule(
            "src/v2/repositories/GuildRepository.js",
            {
                ensure: (
                    guildId,
                    guildName
                ) => {
                    ensuredGuild = [
                        guildId,
                        guildName
                    ];
                }
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
            require.resolve("../src/commands/config");

        delete require.cache[commandPath];

        const command =
            require("../src/commands/config");

        const interaction = {
            guildId: "guild-a",
            guild: {
                id: "guild-a",
                name: "GreyOS",
                roles: {
                    everyone: {
                        id: "everyone"
                    }
                },
                members: {
                    me: {
                        id: "bot"
                    }
                },
                channels: {
                    create: async options => {
                        createdChannelOptions = options;

                        return {
                            id: "validation-channel",
                            toString: () => "<#validation-channel>"
                        };
                    }
                }
            },
            options: {
                getSubcommand: () => "validation",
                getChannel: () => null,
                getBoolean: () => true,
                getRole: () => ({
                    id: "staff-role"
                })
            },
            reply: async payload => {
                replyPayload = payload;
            }
        };

        await command.execute(interaction);

        assert.deepEqual(
            ensuredGuild,
            ["guild-a", "GreyOS"]
        );

        assert.equal(
            createdChannelOptions.name,
            "📋・validations"
        );

        assert.equal(
            createdChannelOptions.permissionOverwrites
                .some(overwrite =>
                    overwrite.id === "staff-role"
                ),
            true
        );

        assert.deepEqual(
            validationChannelId,
            ["guild-a", "validation-channel"]
        );

        assert.match(
            replyPayload.content,
            /créé et enregistré/
        );
    }
);
