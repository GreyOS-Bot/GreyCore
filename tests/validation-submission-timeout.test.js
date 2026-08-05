const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "l’envoi en validation confirme le bouton avant les accès Discord lents",
    async () => {
        const order = [];

        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    validation: {
                        getInstallation: () => ({
                            id: "539",
                            guild_id: "guild",
                            continuity_id: "continuity",
                            local_avatar_url:
                                "https://image.test/avatar.png"
                        })
                    },
                    continuity: {
                        getById: () => ({
                            id: "continuity",
                            character_id: "character"
                        })
                    },
                    user: {
                        getOrCreate: () => ({
                            id: "user-record"
                        })
                    },
                    library: {
                        getCharacterForUser: () => ({
                            id: "character",
                            proxy_name: "Reya"
                        })
                    },
                    guildSettings: {
                        getValidationChannelId:
                            () => "validation-channel"
                    }
                }
            }
        );
        stubModule(
            "src/v2/core/services/FastInteractionAcknowledgementService.js",
            {
                deferComponentUpdate:
                    async interaction => {
                        order.push("acknowledged");
                        interaction.deferred = true;
                    }
            }
        );
        stubModule(
            "src/v2/services/validation/ValidationSubmissionService.js",
            {
                submit: async () => {
                    order.push("submitted");

                    return {
                        submissionResult: {
                            installation: {
                                id: "539"
                            }
                        }
                    };
                }
            }
        );
        stubModule(
            "src/v2/views/validation/ValidationSubmissionView.js",
            {
                success: () => ({
                    content: "Demande envoyée"
                })
            }
        );

        const handlerPath = require.resolve(
            "../src/v2/interactions/buttons/requestInstallationValidation"
        );
        delete require.cache[handlerPath];
        const handler = require(
            "../src/v2/interactions/buttons/requestInstallationValidation"
        );
        const interaction = {
            customId: "v2_install_submit:539",
            guildId: "guild",
            guild: {
                id: "guild",
                channels: {
                    fetch: async () => {
                        order.push("channel-fetched");

                        return {
                            id: "validation-channel",
                            isTextBased: () => true
                        };
                    }
                }
            },
            user: {
                id: "owner"
            },
            message: {},
            isButton: () => true,
            editReply: async payload => {
                order.push("edited");
                interaction.payload = payload;
            }
        };

        await handler(interaction);

        assert.deepEqual(
            order,
            [
                "acknowledged",
                "channel-fetched",
                "submitted",
                "edited"
            ]
        );
        assert.equal(
            interaction.payload.content,
            "Demande envoyée"
        );
    }
);
