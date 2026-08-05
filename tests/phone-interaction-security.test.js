const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    MessageFlags
} = require("discord.js");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la recherche téléphone refuse un téléphone forgé et accepte celui du personnage",
    async () => {
        const calls = [];
        let continuityCharacterId =
            "other-character";

        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById:
                    () => ({
                        id:
                            "character",
                        discord_user_id:
                            "user"
                    })
            }
        );

        stubModule(
            "src/v2/managers/PhoneV2Manager.js",
            {
                getPhoneById:
                    phoneId => ({
                        id:
                            phoneId
                    }),
                getContinuityByPhone:
                    () => ({
                        character_id:
                            continuityCharacterId
                    }),
                getOrCreateConversation:
                    (
                        senderPhoneId,
                        recipientPhoneId
                    ) => {
                        calls.push([
                            "conversation",
                            senderPhoneId,
                            recipientPhoneId
                        ]);

                        return {
                            id:
                                12
                        };
                    }
            }
        );

        stubModule(
            "src/v2/pages/character/CharacterPhoneConversationsPage.js",
            {
                execute:
                    async (
                        interaction,
                        characterId
                    ) => {
                        calls.push([
                            "page",
                            characterId
                        ]);
                    }
            }
        );

        stubModule(
            "src/v2/pages/character/PhoneCallStartPage.js",
            {
                execute:
                    async () => {
                        calls.push([
                            "call"
                        ]);
                    }
            }
        );

        const handler =
            require(
                "../src/v2/interactions/selectMenus/PhoneSearchSelectV2"
            );

        const forgedInteraction =
            createInteraction(
                99
            );

        await handler(
            forgedInteraction
        );

        assert.match(
            forgedInteraction
                .replied
                .content,
            /ne correspond pas/
        );

        assert.equal(
            forgedInteraction
                .replied
                .flags,
            MessageFlags.Ephemeral
        );

        assert.deepEqual(
            calls,
            []
        );

        continuityCharacterId =
            "character";

        await handler(
            createInteraction(
                1
            )
        );

        assert.deepEqual(
            calls,
            [
                [
                    "conversation",
                    1,
                    2
                ],
                [
                    "page",
                    "character"
                ]
            ]
        );
    }
);

test(
    "la fenêtre de SMS refuse le personnage d’un autre joueur",
    async () => {
        let phoneLookupCount = 0;

        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getPlayableDashboardData:
                    () => ({
                        character: {
                            id:
                                "character",
                            discord_user_id:
                                "other-user"
                        },
                        continuity: {
                            id:
                                "continuity"
                        }
                    })
            }
        );

        stubModule(
            "src/v2/managers/PhoneV2Manager.js",
            {
                getPhoneByContinuity:
                    () => {
                        phoneLookupCount +=
                            1;

                        return {
                            id:
                                1
                        };
                    }
            }
        );

        stubModule(
            "src/v2/managers/PhoneConversationV2Manager.js",
            {
                getParticipants:
                    () => []
            }
        );

        const phoneMessageModal =
            require(
                "../src/v2/modals/PhoneMessageModal"
            );

        const interaction = {
            guildId:
                "guild",
            user: {
                id:
                    "user"
            },
            inGuild:
                () => true,
            reply:
                async function (
                    payload
                ) {
                    this.replied =
                        payload;
                }
        };

        await phoneMessageModal.show(
            interaction,
            12,
            "character"
        );

        assert.match(
            interaction
                .replied
                .content,
            /ne vous appartient pas/
        );

        assert.equal(
            phoneLookupCount,
            0
        );
    }
);

test(
    "l'envoi d'un SMS ferme son interface sans supprimer le SMS auquel on rÃ©pond",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById:
                    () => ({
                        id: "character",
                        discord_user_id: "user"
                    })
            }
        );

        stubModule(
            "src/v2/managers/PhoneV2Manager.js",
            {
                getPhoneByContinuity:
                    () => ({
                        id: 7
                    })
            }
        );

        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getPlayableDashboardData:
                    () => ({
                        continuity: {
                            id: "continuity"
                        }
                    })
            }
        );

        stubModule(
            "src/v2/services/phone/PhoneService.js",
            {
                sendSms:
                    async data => {
                        calls.push([
                            "sendSms",
                            data.conversationId,
                            data.content
                        ]);
                    }
            }
        );

        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                deferPrivate:
                    async interaction => {
                        calls.push(["defer"]);
                        interaction.deferred = true;
                    },
                editOrReplyError:
                    async () => {
                        throw new Error(
                            "Une erreur ne devait pas être envoyée."
                        );
                    }
            }
        );

        const handler =
            require(
                "../src/v2/interactions/modals/PhoneMessageV2"
            );

        const interaction = {
            customId:
                "v2_phone_message_modal:12:character",
            guildId:
                "guild",
            channel: {},
            client: {},
            user: {
                id: "user"
            },
            fields: {
                getTextInputValue:
                    () => "Bonjour !"
            },
            editReply:
                async payload => {
                    calls.push([
                        "editReply",
                        payload
                    ]);
                },
            message: {
                delete:
                    async () => {
                        calls.push([
                            "delete"
                        ]);
                    }
            }
        };

        await handler(
            interaction
        );

        assert.deepEqual(
            calls,
            [
                ["defer"],
                [
                    "sendSms",
                    12,
                    "Bonjour !"
                ],
                ["delete"],
                [
                    "editReply",
                    { content: "✅ SMS envoyé." }
                ]
            ]
        );

        const quickReplyInteraction = {
            customId:
                "v2_phone_message_modal:12:character:quick_reply",
            guildId:
                "guild",
            channel: {},
            client: {},
            user: {
                id: "user"
            },
            fields: {
                getTextInputValue:
                    () => "Je te rÃ©ponds !"
            },
            editReply:
                async payload => {
                    calls.push([
                        "editReply",
                        payload
                    ]);
                },
            message: {
                delete:
                    async () => {
                        throw new Error(
                            "Le SMS d'origine ne doit pas Ãªtre supprimÃ©."
                        );
                    }
            },
        };

        await handler(
            quickReplyInteraction
        );

        assert.deepEqual(
            calls.slice(4),
            [
                ["defer"],
                [
                    "sendSms",
                    12,
                    "Je te rÃ©ponds !"
                ],
                [
                    "editReply",
                    {
                        content:
                            "\u2705 SMS envoy\u00e9."
                    }
                ]
            ]
        );
    }
);

function createInteraction(
    senderPhoneId
) {
    return {
        customId:
            `v2_phone_search_select:character:${senderPhoneId}:sms`,
        values: [
            "phone:2"
        ],
        guildId:
            "guild",
        user: {
            id:
                "user"
        },
        inGuild:
            () => true,
        reply:
            async function (
                payload
            ) {
                this.replied =
                    payload;
            }
    };
}
