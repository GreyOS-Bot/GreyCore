const test = require("node:test");
const assert = require("node:assert/strict");

const { stubModule } = require("./helpers/moduleStub");

test(
    "la bibliothèque personnelle passe par le verrou de validation",
    async () => {
        let openedCharacterId = null;

        stubModule("src/v2/index.js", {
            managers: {
                user: {
                    getOrCreate: () => ({ id: 7 })
                },
                library: {
                    getCharacterForUser: () => ({
                        id: 42,
                        continuity_id: 12
                    })
                }
            }
        });
        stubModule(
            "src/v2/pages/character/OpenCharacterDashboardPage.js",
            {
                execute: async (
                    interaction,
                    characterId
                ) => {
                    openedCharacterId = characterId;
                    interaction.usedValidationGate = true;
                }
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            { replyError: async () => {} }
        );

        const handlerPath = require.resolve(
            "../src/v2/interactions/selectMenus/selectLibraryCharacter"
        );
        delete require.cache[handlerPath];
        const handler = require(handlerPath);
        const interaction = {
            values: ["42"],
            user: { id: "owner" },
            guildId: "guild"
        };

        await handler(interaction);

        assert.equal(openedCharacterId, 42);
        assert.equal(
            interaction.usedValidationGate,
            true
        );
    }
);
