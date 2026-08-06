const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "une relation ouverte en message privé retrouve l'unique serveur du personnage",
    () => {
        stubModule(
            "src/v2/managers/InstallationV2Manager.js",
            {
                getByCharacter: characterId => {
                    assert.equal(
                        characterId,
                        "character-jay"
                    );

                    return [
                        {
                            guild_id: "greyline",
                            status: "approved"
                        },
                        {
                            guild_id: "old-server",
                            status: "archived"
                        }
                    ];
                }
            }
        );

        const modulePath = require.resolve(
            "../src/v2/interactions/relationships/RelationshipUtils"
        );
        delete require.cache[modulePath];

        const {
            resolveRelationshipGuildId
        } = require(
            "../src/v2/interactions/relationships/RelationshipUtils"
        );

        assert.equal(
            resolveRelationshipGuildId(
                { guildId: null },
                "character-jay"
            ),
            "greyline"
        );
    }
);
