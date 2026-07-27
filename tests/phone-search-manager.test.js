const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la recherche téléphone fusionne et classe ses trois sources après sa découpe",
    () => {
        const databaseCalls = [];

        stubModule(
            "src/database/database.js",
            {
                prepare:
                    sql => ({
                        get:
                            phoneId =>
                                Number(
                                    phoneId
                                ) === 1
                                    ? {
                                        id:
                                            1,
                                        phone_number:
                                            "555-0001"
                                    }
                                    : null,
                        all:
                            (...parameters) => {
                                databaseCalls.push([
                                    sql,
                                    parameters
                                ]);

                                return [
                                    {
                                        phone_id:
                                            2,
                                        phone_number:
                                            "555-0002",
                                        continuity_id:
                                            102,
                                        character_id:
                                            202,
                                        character_name:
                                            "Billie",
                                        character_avatar_url:
                                            null
                                    },
                                    {
                                        phone_id:
                                            3,
                                        phone_number:
                                            "555-0003",
                                        continuity_id:
                                            103,
                                        character_id:
                                            203,
                                        character_name:
                                            "Alba",
                                        character_avatar_url:
                                            null
                                    }
                                ];
                            }
                    })
            }
        );

        stubModule(
            "src/v2/managers/PhoneContactV2Manager.js",
            {
                getForPhone:
                    () => [
                        {
                            id:
                                10,
                            display_name:
                                "Billie",
                            phone_number:
                                "555-0002",
                            linked_phone_id:
                                2,
                            linked_character_id:
                                202,
                            linked_continuity_id:
                                102,
                            contact_type:
                                "greycore",
                            favorite:
                                1,
                            pinned:
                                0,
                            blocked:
                                0,
                            interaction_count:
                                5,
                            last_interaction_at:
                                new Date()
                                    .toISOString()
                        },
                        {
                            id:
                                11,
                            display_name:
                                "Taxi",
                            phone_number:
                                "555-TAXI",
                            linked_phone_id:
                                null,
                            contact_type:
                                "external",
                            favorite:
                                0,
                            pinned:
                                0,
                            blocked:
                                0,
                            interaction_count:
                                0,
                            last_interaction_at:
                                null
                        },
                        {
                            id:
                                12,
                            display_name:
                                "Bloqué",
                            linked_phone_id:
                                4,
                            blocked:
                                1
                        }
                    ],
                getByLinkedPhone:
                    (
                        viewerPhoneId,
                        linkedPhoneId
                    ) =>
                        Number(
                            linkedPhoneId
                        ) === 2
                            ? {
                                id:
                                    10
                            }
                            : null
            }
        );

        stubModule(
            "src/v2/managers/PhoneConversationV2Manager.js",
            {
                getForPhone:
                    () => [
                        {
                            id:
                                20,
                            conversation_type:
                                "private",
                            is_favorite:
                                0,
                            is_pinned:
                                1,
                            unread_count:
                                2,
                            last_message_content:
                                "À bientôt",
                            last_message_created_at:
                                new Date()
                                    .toISOString()
                        },
                        {
                            id:
                                21,
                            conversation_type:
                                "group",
                            name:
                                "La bande",
                            is_favorite:
                                0,
                            is_pinned:
                                0,
                            unread_count:
                                0,
                            updated_at:
                                new Date()
                                    .toISOString()
                        }
                    ],
                getParticipants:
                    conversationId =>
                        Number(
                            conversationId
                        ) === 20
                            ? [
                                {
                                    phone_id:
                                        1
                                },
                                {
                                    phone_id:
                                        2,
                                    phone_number:
                                        "555-0002",
                                    character_id:
                                        202,
                                    continuity_id:
                                        102,
                                    character_name:
                                        "Billie",
                                    participant_type:
                                        "greycore"
                                }
                            ]
                            : [
                                {
                                    phone_id:
                                        1
                                },
                                {
                                    phone_id:
                                        2,
                                    character_name:
                                        "Billie"
                                },
                                {
                                    phone_id:
                                        3,
                                    character_name:
                                        "Alba"
                                }
                            ],
                getDisplayName:
                    conversation =>
                        Number(
                            conversation.id
                        ) === 20
                            ? "Billie"
                            : "La bande"
            }
        );

        const manager =
            require(
                "../src/v2/managers/PhoneSearchV2Manager"
            );

        const results =
            manager.search({
                viewerPhoneId:
                    1,
                guildId:
                    "guild",
                query:
                    "",
                limit:
                    25
            });

        assert.equal(
            results[0].title,
            "Billie"
        );

        assert.equal(
            results[0].contactId,
            10
        );

        assert.equal(
            results[0].conversationId,
            20
        );

        assert.equal(
            results[0].source,
            "contacts,conversations"
        );

        assert.equal(
            results.some(
                result =>
                    result.title ===
                        "Alba"
                    && result.source ===
                        "greycore"
            ),
            true
        );

        assert.equal(
            results.some(
                result =>
                    result.title ===
                        "La bande"
                    && result.group ===
                        true
            ),
            true
        );

        assert.equal(
            results.some(
                result =>
                    result.title ===
                        "Taxi"
                    && result.external ===
                        true
            ),
            true
        );

        assert.equal(
            results.some(
                result =>
                    result.title ===
                        "Bloqué"
            ),
            false
        );

        assert.equal(
            databaseCalls.some(
                call =>
                    call[1].includes(
                        "guild"
                    )
            ),
            true
        );

        assert.equal(
            manager.normalize(
                "  Élodie  "
            ),
            "elodie"
        );

        assert.throws(
            () =>
                manager.search({
                    viewerPhoneId:
                        1
                }),
            /serveur/
        );

        assert.throws(
            () =>
                manager.search({
                    guildId:
                        "guild"
                }),
            /téléphone utilisé/
        );
    }
);
