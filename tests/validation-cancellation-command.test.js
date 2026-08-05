const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "le staff annule une installation non aboutie sans supprimer le personnage",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/services/validation/ValidationManagerV2.js",
            {
                getInstallation: () => ({
                    validation_channel_id: null,
                    validation_message_id: null
                }),
                cancelIncompleteInstallation: data => {
                    calls.push(data);

                    return {
                        context: {
                            proxy_name: "Reya"
                        }
                    };
                }
            }
        );
        stubModule(
            "src/v2/core/services/StaffCommandAccessService.js",
            {
                requireStaffCommandAccess:
                    async () => true
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                deferPrivate: async interaction => {
                    interaction.deferred = true;
                },
                replyPrivate: async (
                    interaction,
                    payload
                ) => {
                    interaction.payload = payload;
                }
            }
        );

        const commandPath = require.resolve(
            "../src/commands/validations"
        );
        delete require.cache[commandPath];

        const command = require(
            "../src/commands/validations"
        );
        const interaction = {
            guildId: "guild",
            user: {
                id: "staff"
            },
            options: {
                getSubcommand: () => "annuler",
                getString: name =>
                    name === "personnage"
                        ? "installation"
                        : "Création abandonnée"
            }
        };

        await command.execute(interaction);

        assert.deepEqual(
            calls,
            [
                {
                    installationId: "installation",
                    guildId: "guild",
                    cancelledBy: "staff",
                    reason: "Création abandonnée"
                }
            ]
        );
        assert.match(
            interaction.payload,
            /n’a pas été supprimé/
        );
    }
);
