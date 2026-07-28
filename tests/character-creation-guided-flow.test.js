const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const pendingActionManager =
    require(
        "../src/v2/managers/PendingActionManager"
    );

const createCharacter =
    require(
        "../src/v2/interactions/modals/createCharacterV2"
    );

test(
    "la creation complete conserve les donnees puis ouvre la seconde etape",
    async () => {
        const userId =
            "guided-creation-user";

        try {
            const firstInteraction =
                createInteraction({
                    customId:
                        "v2_character_create_submit:personnage_joue",
                    userId,
                    values: {
                        character_proxy_name:
                            "Alba",
                        profile_firstname:
                            "Alba",
                        profile_lastname:
                            "Grey",
                        profile_age:
                            "23",
                        profile_occupation:
                            "Avocate"
                    }
                });

            await createCharacter(
                firstInteraction
            );

            assert.match(
                firstInteraction.replyPayload.content,
                /Premi\u00e8re \u00e9tape/
            );
            assert.equal(
                firstInteraction.replyPayload
                    .components[0]
                    .toJSON()
                    .components[0]
                    .custom_id,
                "v2_character_create_details_open:personnage_joue"
            );

            const secondInteraction =
                createInteraction({
                    customId:
                        "v2_character_create_details_open:personnage_joue",
                    userId
                });

            await createCharacter.openDetails(
                secondInteraction,
                "personnage_joue"
            );

            const secondModal =
                secondInteraction.modal
                    .toJSON();

            assert.equal(
                secondModal.custom_id,
                "v2_character_create_details_submit:personnage_joue"
            );
            assert.deepEqual(
                secondModal.components.map(
                    row => row.components[0].custom_id
                ),
                [
                    "profile_gang",
                    "profile_birthday",
                    "profile_creation_date",
                    "profile_story"
                ]
            );
        } finally {
            pendingActionManager.delete(userId);
        }
    }
);

function createInteraction({
    customId,
    userId,
    values = {}
}) {
    return {
        customId,
        guild: {
            id: "guild",
            name: "Serveur beta"
        },
        guildId: "guild",
        user: {
            id: userId
        },
        inGuild: () => true,
        fields: {
            getTextInputValue: fieldId =>
                values[fieldId]
                || ""
        },
        reply: async function reply(payload) {
            this.replyPayload = payload;
        },
        showModal: async function showModal(modal) {
            this.modal = modal;
        }
    };
}
