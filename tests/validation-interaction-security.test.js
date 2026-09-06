const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    MessageFlags,
    PermissionsBitField
} = require("discord.js");

const {
    stubModule
} = require("./helpers/moduleStub");

const validationStaffPolicy =
    require(
        "../src/v2/core/policies/ValidationStaffPolicy"
    );

test(
    "la validation reconnaît les permissions Discord actuelles et historiques",
    () => {
        assert.equal(
            validationStaffPolicy
                .canReview({
                    guildId:
                        "guild",
                    memberPermissions: {
                        has:
                            permission =>
                                permission ===
                                PermissionsBitField
                                    .Flags
                                    .ManageGuild
                    }
                }),
            true
        );

        assert.equal(
            validationStaffPolicy
                .canReview({
                    guild: {
                        id:
                            "guild"
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
                }),
            true
        );

        assert.equal(
            validationStaffPolicy
                .canReview({
                    memberPermissions: {
                        has:
                            () => true
                    }
                }),
            false
        );
    }
);

test(
    "un membre du staff ne peut pas valider l’installation d’un autre serveur",
    async () => {
        let approvalCount = 0;

        stubModule(
            "src/v2/core/services/ValidationPermissionAccessService.js",
            { canRead: () => true, canWrite: () => true }
        );

        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    validation: {
                        getInstallation:
                            () => ({
                                id:
                                    "installation",
                                guild_id:
                                    "other-guild"
                            }),
                        approveInstallation:
                            () => {
                                approvalCount +=
                                    1;
                            }
                    }
                }
            }
        );

        const approve =
            require(
                "../src/v2/interactions/buttons/validationApprove"
            );

        const interaction =
            createInteraction({
                customId:
                    "v2_validation_approve:installation",
                guildId:
                    "guild",
                permissions:
                    permission =>
                        permission ===
                        PermissionsBitField
                            .Flags
                            .ManageGuild
            });

        await approve(
            interaction
        );

        assert.match(
            interaction
                .replied
                .content,
            /n’appartient pas à ce serveur/
        );

        assert.equal(
            interaction
                .replied
                .flags,
            MessageFlags.Ephemeral
        );

        assert.equal(
            approvalCount,
            0
        );
    }
);

test(
    "un joueur ne peut pas soumettre l’installation d’un personnage tiers",
    async () => {
        let submissionCount = 0;

        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    validation: {
                        getInstallation:
                            () => ({
                                id:
                                    "installation",
                                guild_id:
                                    "guild",
                                continuity_id:
                                    "continuity"
                            }),
                        submitInstallation:
                            () => {
                                submissionCount +=
                                    1;
                            }
                    },
                    continuity: {
                        getById:
                            () => ({
                                id:
                                    "continuity",
                                character_id:
                                    "character"
                            })
                    },
                    user: {
                        getOrCreate:
                            () => ({
                                id:
                                    "user-record"
                            })
                    },
                    library: {
                        getCharacterForUser:
                            () => null
                    }
                }
            }
        );

        const submit =
            require(
                "../src/v2/interactions/buttons/requestInstallationValidation"
            );

        const interaction =
            createInteraction({
                customId:
                    "v2_install_submit:installation",
                guildId:
                    "guild"
            });

        await submit(
            interaction
        );

        assert.match(
            interaction
                .replied
                .content,
            /ne peux pas envoyer/
        );

        assert.equal(
            submissionCount,
            0
        );
    }
);

function createInteraction({
    customId,
    guildId,
    permissions =
        () => false
}) {
    return {
        customId,
        guildId,
        guild: {
            id:
                guildId,
            name:
                "GreyCore"
        },
        user: {
            id:
                "user"
        },
        memberPermissions: {
            has:
                permissions
        },
        inGuild:
            () => Boolean(
                guildId
            ),
        reply:
            async function (
                payload
            ) {
                this.replied =
                    payload;
            }
    };
}
