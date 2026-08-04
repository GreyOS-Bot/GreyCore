const test = require("node:test");
const assert = require("node:assert/strict");

const { stubModule } =
    require("./helpers/moduleStub");

test(
    "la carte staff propose un rappel sur une creation non envoyee",
    () => {
        const builder = require(
            "../src/v2/builders/ValidationCardBuilder"
        );

        const card = builder.build({
            installation: {
                id: 7,
                status: "draft",
                proxy_name: "Reya",
                character_type: "personnage_joue",
                firstname: "Reya",
                story: "Histoire",
                proxy_enabled: 0
            },
            guildName: "Greyline",
            requesterDisplay: "<@owner>"
        });

        const ids = card.components
            .flatMap(row =>
                row.toJSON().components
            )
            .map(component =>
                component.custom_id
            );

        assert.ok(
            ids.includes(
                "v2_validation_remind:7"
            )
        );
    }
);

test(
    "le staff peut envoyer un rappel prive au proprietaire",
    async () => {
        let reminderPayload = null;

        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    validation: {
                        getInstallationContext:
                            () => ({
                                id: 7,
                                guild_id: "guild",
                                status: "draft",
                                owner_id: "owner",
                                proxy_name: "Reya"
                            })
                    }
                }
            }
        );
        stubModule(
            "src/v2/core/policies/ValidationStaffPolicy.js",
            { canReview: () => true }
        );
        stubModule(
            "src/v2/services/validation/ValidationNotificationService.js",
            {
                notifyReminder: async payload => {
                    reminderPayload = payload;
                    return true;
                }
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyPrivate: async (
                    interaction,
                    message
                ) => {
                    interaction.replyMessage =
                        message;
                },
                replyError: async (
                    interaction,
                    message
                ) => {
                    interaction.error = message;
                }
            }
        );

        const handlerPath = require.resolve(
            "../src/v2/interactions/buttons/sendValidationReminder"
        );
        delete require.cache[handlerPath];

        const handler = require(handlerPath);
        const interaction = {
            customId:
                "v2_validation_remind:7",
            guildId: "guild",
            guild: {
                name: "Greyline"
            },
            client: {},
            user: {
                id: "staff"
            }
        };

        await handler(interaction);

        assert.equal(
            reminderPayload.playerId,
            "owner"
        );
        assert.match(
            interaction.replyMessage,
            /rappel privé/i
        );
    }
);

test(
    "la carte staff conserve le rappel pendant la validation",
    () => {
        const builder = require(
            "../src/v2/builders/ValidationCardBuilder"
        );
        const card = builder.build({
            installation: {
                id: 8,
                status: "pending",
                proxy_name: "Reya",
                character_type: "personnage_joue",
                firstname: "Reya",
                story: "Histoire",
                proxy_enabled: 0
            },
            guildName: "Greyline",
            requesterDisplay: "<@owner>"
        });
        const ids = card.components
            .flatMap(row => row.toJSON().components)
            .map(component => component.custom_id);

        assert.ok(ids.includes("v2_validation_remind:8"));
    }
);
