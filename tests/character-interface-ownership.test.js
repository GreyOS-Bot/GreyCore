const test =
    require("node:test");

const assert =
    require("node:assert/strict");

test(
    "seul le propriétaire peut fermer son interface personnelle",
    async () => {
        const router =
            require(
                "../src/v2/router/buttons/CharacterRouter"
            );

        const ownerInteraction =
            createInteraction({
                userId: "owner",
                interfaceOwnerId: "owner"
            });

        assert.equal(
            await router(ownerInteraction),
            true
        );

        assert.deepEqual(
            ownerInteraction.updatedPayload,
            {
                content: "✅ Interface fermée.",
                embeds: [],
                components: []
            }
        );

        const visitorInteraction =
            createInteraction({
                userId: "visitor",
                interfaceOwnerId: "owner"
            });

        assert.equal(
            await router(visitorInteraction),
            true
        );

        assert.equal(
            visitorInteraction.updatedPayload,
            undefined
        );
        assert.match(
            visitorInteraction.replyPayload.content,
            /appartient à un autre utilisateur/
        );
    }
);

function createInteraction({
    userId,
    interfaceOwnerId
}) {
    const interaction = {
        customId: "character_close",
        guildId: "guild",
        user: {
            id: userId
        },
        message: {
            interactionMetadata: {
                user: {
                    id: interfaceOwnerId
                }
            }
        },
        isButton: () => true,
        update: async payload => {
            interaction.updatedPayload = payload;
        },
        reply: async payload => {
            interaction.replyPayload = payload;
        }
    };

    return interaction;
}
