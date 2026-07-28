const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const manager =
    require(
        "../src/v2/managers/RelationshipModalContextManager"
    );

const {
    createRelationshipModal
} = require(
    "../src/v2/interactions/relationships/RelationshipModalFactory"
);

test(
    "la fen\u00eatre de relation utilise un contexte court et prot\u00e9g\u00e9",
    () => {
        const contextId =
            manager.create({
                userId:
                    "user",
                guildId:
                    "guild",
                continuityAId:
                    "2_3dbf0f3b-b9a8-4563-981e-5c54f34c65b0",
                continuityBId:
                    "2_760bc498-b9a8-4563-981e-5c54f34c65b0",
                relationshipTypeId:
                    "relationship-type-with-a-long-identifier"
            });

        const customId =
            createRelationshipModal({
                contextId
            })
                .toJSON()
                .custom_id;

        assert.ok(
            customId.length <= 100
        );

        const context =
            manager.consume(
                contextId,
                {
                    userId:
                        "user",
                    guildId:
                        "guild"
                }
            );

        assert.equal(
            context.continuityAId,
            "2_3dbf0f3b-b9a8-4563-981e-5c54f34c65b0"
        );
        assert.equal(
            context.continuityBId,
            "2_760bc498-b9a8-4563-981e-5c54f34c65b0"
        );
        assert.equal(
            context.relationshipTypeId,
            "relationship-type-with-a-long-identifier"
        );
        assert.equal(
            typeof context.createdAt,
            "number"
        );
    }
);
