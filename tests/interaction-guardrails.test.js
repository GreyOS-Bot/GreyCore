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
    "une réponse privée complète le defer initial puis utilise un suivi après réponse",
    async () => {
        const deferredInteraction =
            createInteraction({
                inGuild: true,
                deferred: true
            });

        await responseService.replyPrivate(
            deferredInteraction,
            "Résultat"
        );

        assert.deepEqual(
            deferredInteraction.edited,
            { content: "Résultat" }
        );
        assert.equal(
            deferredInteraction.followed,
            undefined
        );

        deferredInteraction.replied = true;

        await responseService.replyPrivate(
            deferredInteraction,
            "Complément"
        );

        assert.equal(
            deferredInteraction.followed.content,
            "Complément"
        );
    }
);

test(
    "une réponse privée après deferUpdate ne remplace pas le composant",
    async () => {
        const interaction =
            createInteraction({
                inGuild: true,
                deferred: true
            });

        interaction.isMessageComponent =
            () => true;
        interaction.ephemeral = null;

        await responseService.replyPrivate(
            interaction,
            "Information"
        );

        assert.equal(
            interaction.edited,
            undefined
        );
        assert.equal(
            interaction.followed.content,
            "Information"
        );
    }
);

test(
    "le service central mémorise un deferUpdate même sans métadonnées de composant",
    async () => {
        const interaction =
            createInteraction({
                inGuild: true
            });

        interaction.deferUpdate =
            async function () {
                this.deferred = true;
            };

        const acknowledgementService =
            require(
                "../src/v2/core/services/FastInteractionAcknowledgementService"
            );

        await acknowledgementService
            .deferComponentUpdate(
                interaction
            );

        await responseService.replyPrivate(
            interaction,
            "Information"
        );

        assert.equal(
            interaction.edited,
            undefined
        );
        assert.equal(
            interaction.followed.content,
            "Information"
        );
    }
);

test(
    "une erreur après defer complète la réponse sans double réponse",
    async () => {
        const interaction =
            createInteraction({
                inGuild: true,
                deferred: true
            });

        await responseService.replyError(
            interaction,
            "Action impossible."
        );

        assert.equal(
            interaction.replyCalls,
            0
        );
        assert.equal(
            interaction.followUpCalls,
            0
        );
        assert.equal(
            interaction.editReplyCalls,
            1
        );
        assert.equal(
            interaction.edited.content,
            "❌ Action impossible."
        );
    }
);

test(
    "la permission personnage reste une primitive d’ownership V1 et V2",
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
                    .isOwner(
                        ownerInteraction,
                        character
                    ),
                true
            );
        }

        assert.equal(
            characterManagementPolicy
                .isOwner(
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
                .isOwner(
                    staffInteraction,
                    {
                        owner_id:
                            "user"
                    }
                ),
            false
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
                .isOwner(
                    legacyStaffInteraction,
                    {
                        owner_id:
                            "user"
                    }
                ),
            false
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
    replied = false,
    deferred = false
}) {
    return {
        replied,
        deferred,
        replyCalls: 0,
        followUpCalls: 0,
        editReplyCalls: 0,
        inGuild:
            () => inGuild,
        reply: async function (
            payload
        ) {
            this.replyCalls += 1;
            this.replied = payload;
        },
        followUp: async function (
            payload
        ) {
            this.followUpCalls += 1;
            this.followed = payload;
        },
        editReply: async function (
            payload
        ) {
            this.editReplyCalls += 1;
            this.edited = payload;
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
