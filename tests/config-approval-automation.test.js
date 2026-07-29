const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "le staff peut configurer l’accueil après validation depuis /config",
    async () => {
        let savedConfiguration = null;
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
                    characterApprovalAutomation: {
                        configure: configuration => {
                            savedConfiguration =
                                configuration;

                            return {
                                is_enabled: 1,
                                approved_character_count:
                                    configuration
                                        .approvedCharacterCount,
                                required_role_id:
                                    configuration.requiredRoleId,
                                remove_role_id:
                                    configuration.removeRoleId,
                                add_role_id:
                                    configuration.addRoleId,
                                welcome_channel_id:
                                    configuration.welcomeChannelId,
                                welcome_message:
                                    configuration.welcomeMessage
                            };
                        }
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
            require.resolve("../src/commands/config");

        delete require.cache[commandPath];

        const command =
            require("../src/commands/config");

        const roles = {
            role_a_verifier: {
                id: "newcomer"
            },
            role_a_retirer: {
                id: "newcomer"
            },
            role_a_ajouter: {
                id: "member"
            }
        };

        await command.execute({
            guild: {
                id: "guild",
                name: "GreyOS"
            },
            options: {
                getSubcommand:
                    () => "automatisation",
                getInteger: () => 2,
                getRole: name => roles[name] || null,
                getChannel: () => ({
                    id: "welcome"
                }),
                getString: () =>
                    "Bienvenue {user} !"
            },
            reply: async payload => {
                replyPayload = payload;
            }
        });

        assert.deepEqual(
            savedConfiguration,
            {
                guildId: "guild",
                approvedCharacterCount: 2,
                requiredRoleId: "newcomer",
                removeRoleId: "newcomer",
                addRoleId: "member",
                welcomeChannelId: "welcome",
                welcomeMessage:
                    "Bienvenue {user} !"
            }
        );

        assert.match(
            replyPayload.content,
            /Accueil automatique activé/
        );
        assert.match(
            replyPayload.content,
            /une seule fois/
        );
    }
);
