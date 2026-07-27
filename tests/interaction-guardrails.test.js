const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    MessageFlags,
    PermissionsBitField
} = require("discord.js");

const responseService =
    require(
        "../src/v2/core/services/InteractionResponseService"
    );

const characterManagementPolicy =
    require(
        "../src/v2/core/policies/CharacterManagementPolicy"
    );

test(
    "les erreurs Discord restent privées sur serveur et valides en message privé",
    async () => {
        const guildInteraction =
            createInteraction({
                inGuild:
                    true
            });

        await responseService.replyError(
            guildInteraction,
            "Action impossible."
        );

        assert.equal(
            guildInteraction.replied
                .content,
            "❌ Action impossible."
        );

        assert.equal(
            guildInteraction.replied
                .flags,
            MessageFlags.Ephemeral
        );

        const directInteraction =
            createInteraction({
                inGuild:
                    false
            });

        await responseService.replyError(
            directInteraction,
            "❌ Demande introuvable."
        );

        assert.equal(
            directInteraction.replied
                .content,
            "❌ Demande introuvable."
        );

        assert.equal(
            Object.hasOwn(
                directInteraction.replied,
                "flags"
            ),
            false
        );

        const followedInteraction =
            createInteraction({
                inGuild:
                    true,
                replied:
                    true
            });

        await responseService.replyPrivate(
            followedInteraction,
            "Information"
        );

        assert.equal(
            followedInteraction.followed
                .content,
            "Information"
        );
    }
);

test(
    "la permission personnage reconnaît les propriétaires V1, V2 et le staff",
    () => {
        const ownerInteraction =
            createPolicyInteraction(
                "user"
            );

        for (
            const character
            of [
                {
                    discord_user_id:
                        "user"
                },
                {
                    owner_id:
                        "user"
                },
                {
                    ownerId:
                        "user"
                },
                {
                    user_id:
                        "user"
                }
            ]
        ) {
            assert.equal(
                characterManagementPolicy
                    .canManage(
                        ownerInteraction,
                        character
                    ),
                true
            );
        }

        assert.equal(
            characterManagementPolicy
                .canManage(
                    createPolicyInteraction(
                        "other"
                    ),
                    {
                        owner_id:
                            "user"
                    }
                ),
            false
        );

        const staffInteraction =
            createPolicyInteraction(
                "staff",
                permission =>
                    permission ===
                    PermissionsBitField
                        .Flags
                        .ManageGuild
            );

        assert.equal(
            characterManagementPolicy
                .canManage(
                    staffInteraction,
                    {
                        owner_id:
                            "user"
                    }
                ),
            true
        );

        const legacyStaffInteraction = {
            guildId:
                "guild",
            user: {
                id:
                    "staff"
            },
            member: {
                permissions: {
                    has:
                        permission =>
                            permission ===
                            PermissionsBitField
                                .Flags
                                .Administrator
                }
            }
        };

        assert.equal(
            characterManagementPolicy
                .canManage(
                    legacyStaffInteraction,
                    {
                        owner_id:
                            "user"
                    }
                ),
            true
        );

        assert.equal(
            characterManagementPolicy
                .isOwner(
                    staffInteraction,
                    {
                        owner_id:
                            "user"
                    }
                ),
            false
        );
    }
);

test(
    "les erreurs reconnues remplacent proprement une réponse ou une page déjà ouverte",
    async () => {
        const deferredInteraction = {
            deferred:
                true,
            inGuild:
                () => true,
            editReply:
                async function (
                    payload
                ) {
                    this.edited =
                        payload;
                }
        };

        await responseService
            .editOrReplyError(
                deferredInteraction,
                "Appel introuvable."
            );

        assert.equal(
            deferredInteraction
                .edited
                .content,
            "❌ Appel introuvable."
        );

        assert.equal(
            deferredInteraction
                .edited
                .flags,
            MessageFlags.Ephemeral
        );

        const componentInteraction = {
            update:
                async function (
                    payload
                ) {
                    this.updated =
                        payload;
                }
        };

        await responseService
            .updateError(
                componentInteraction,
                "Action impossible."
            );

        assert.deepEqual(
            componentInteraction
                .updated,
            {
                content:
                    "❌ Action impossible.",
                embeds: [],
                components: []
            }
        );
    }
);

function createInteraction({
    inGuild,
    replied = false
}) {
    return {
        replied,
        inGuild:
            () => inGuild,
        reply: async function (
            payload
        ) {
            this.replied = payload;
        },
        followUp: async function (
            payload
        ) {
            this.followed = payload;
        }
    };
}

function createPolicyInteraction(
    userId,
    permissionCheck =
        () => false
) {
    return {
        guildId:
            "guild",
        user: {
            id:
                userId
        },
        memberPermissions: {
            has:
                permissionCheck
        }
    };
}
