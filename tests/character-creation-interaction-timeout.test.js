const test = require("node:test");
const assert = require("node:assert/strict");

const { stubModule } =
    require("./helpers/moduleStub");

test(
    "la creation accuse reception avant les operations longues",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/services/character/CharacterCreationV2Service.js",
            {
                create: () => {
                    calls.push("create");
                    return {
                        character: {
                            id: "character"
                        },
                        continuity: {
                            id: "continuity"
                        },
                        installation: {
                            id: 7
                        }
                    };
                }
            }
        );
        stubModule(
            "src/v2/managers/PendingActionManager.js",
            {
                get: () => ({
                    type:
                        "character_creation_gender",
                    characterType:
                        "personnage_joue",
                    guildId:
                        "guild",
                    data: {
                        proxyName: "Reya",
                        alias: "Reya"
                    }
                }),
                create: () => {
                    calls.push("pending");
                }
            }
        );
        stubModule(
            "src/v2/services/validation/InstallationStaffTrackingService.js",
            {
                sync: async () => {
                    calls.push("staff-sync");
                }
            }
        );
        stubModule(
            "src/v2/views/character/CharacterAvatarRequiredView.js",
            {
                build: () => ({
                    content: "avatar-required"
                })
            }
        );

        const handlerPath = require.resolve(
            "../src/v2/interactions/modals/createCharacterV2"
        );
        delete require.cache[handlerPath];

        const handler = require(handlerPath);
        const interaction =
            createInteraction(calls);

        await handler.selectGender(interaction, "personnage_joue", "female");

        assert.deepEqual(
            calls,
            [
                "defer",
                "create",
                "pending",
                "staff-sync",
                "edit"
            ]
        );
        assert.equal(
            interaction.payload.content,
            "avatar-required"
        );
    }
);

test(
    "un doublon devient une reponse utilisateur apres l'accuse de reception",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/services/character/CharacterCreationV2Service.js",
            {
                create: () => {
                    calls.push("create");
                    throw new Error(
                        "Un personnage portant ce nom existe déjà dans cette bibliothèque."
                    );
                }
            }
        );
        stubModule(
            "src/v2/managers/PendingActionManager.js",
            {
                get: () => ({
                    type:
                        "character_creation_gender",
                    characterType:
                        "personnage_joue",
                    guildId:
                        "guild",
                    data: {
                        proxyName: "Reya",
                        alias: "Reya"
                    }
                }),
                create: () => {}
            }
        );

        const handlerPath = require.resolve(
            "../src/v2/interactions/modals/createCharacterV2"
        );
        delete require.cache[handlerPath];

        const handler = require(handlerPath);
        const interaction =
            createInteraction(calls);

        await handler.selectGender(interaction, "personnage_joue", "female");

        assert.deepEqual(
            calls,
            [
                "defer",
                "create",
                "edit"
            ]
        );
        assert.match(
            interaction.payload.content,
            /existe déjà/i
        );
    }
);

function createInteraction(calls) {
    return {
        customId:
            "v2_character_create_details_submit:personnage_joue",
        deferred: false,
        replied: false,
        message: {},
        guild: {
            id: "guild",
            name: "Greyline"
        },
        guildId: "guild",
        channelId: "channel",
        client: {},
        user: {
            id: "owner"
        },
        inGuild: () => true,
        fields: {
            getTextInputValue: () => ""
        },
        deferUpdate: async function () {
            calls.push("defer");
            this.deferred = true;
        },
        editReply: async function (payload) {
            calls.push("edit");
            this.payload = payload;
        }
    };
}
