const test = require("node:test");
const assert = require("node:assert/strict");

const { stubModule } = require("./helpers/moduleStub");

test(
    "une fiche validée propose au staff de demander une modification",
    () => {
        const builder = require(
            "../src/v2/builders/ValidationCardBuilder"
        );
        const card = builder.build({
            installation: {
                id: 42,
                status: "approved",
                proxy_name: "Reya",
                character_type: "personnage_joue",
                firstname: "Reya",
                story: "Histoire",
                proxy_enabled: 1
            },
            guildName: "Greyline",
            requesterDisplay: "<@owner>"
        });
        const ids = card.components
            .flatMap(row => row.toJSON().components)
            .map(component => component.custom_id);

        assert.ok(
            ids.includes(
                "v2_validation_request_change:42"
            )
        );
    }
);

test(
    "la demande staff suspend le personnage et prévient son propriétaire",
    async () => {
        let suspension = null;
        let notification = null;

        stubModule("src/v2/index.js", {
            managers: {
                validation: {
                    getInstallation: () => ({
                        id: 42,
                        guild_id: "guild",
                        status: "approved"
                    }),
                    suspendInstallation: data => {
                        suspension = data;
                    },
                    getInstallationContext: () => ({
                        owner_id: "owner",
                        proxy_name: "Reya"
                    })
                }
            }
        });
        stubModule(
            "src/v2/core/policies/ValidationStaffPolicy.js",
            { canReview: () => true }
        );
        stubModule(
            "src/v2/services/validation/ValidationNotificationService.js",
            {
                notifyCorrectionRequested: async data => {
                    notification = data;
                    return true;
                }
            }
        );
        stubModule(
            "src/v2/services/validation/InstallationStaffTrackingService.js",
            { sync: async () => true }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyPrivate: async (interaction, message) => {
                    interaction.replyMessage = message;
                },
                replyError: async (interaction, message) => {
                    interaction.error = message;
                }
            }
        );

        const handlerPath = require.resolve(
            "../src/v2/interactions/modals/submitCharacterChangeRequest"
        );
        delete require.cache[handlerPath];
        const handler = require(handlerPath);
        const interaction = {
            customId:
                "v2_validation_request_change_submit:42",
            guildId: "guild",
            guild: {
                id: "guild",
                name: "Greyline"
            },
            user: { id: "staff" },
            client: {},
            fields: {
                getTextInputValue: () =>
                    "Ajouter les informations manquantes."
            },
            deferUpdate: async () => {}
        };

        await handler(interaction);

        assert.deepEqual(suspension, {
            installationId: "42",
            suspendedBy: "staff",
            reason:
                "Ajouter les informations manquantes."
        });
        assert.equal(notification.playerId, "owner");
        assert.match(
            interaction.replyMessage,
            /personnage est bloqué/i
        );
    }
);
