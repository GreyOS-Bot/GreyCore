const profileManager =
    require(
        "../../managers/ProfileV2Manager"
    );

const characterManager =
    require(
        "../../managers/CharacterV2Manager"
    );

const characterProfilePage =
    require(
        "../../pages/character/CharacterProfilePage"
    );

const characterAvatarRequiredView =
    require(
        "../../views/character/CharacterAvatarRequiredView"
    );

const installationCreatedView =
    require(
        "../../views/deployment/InstallationCreatedView"
    );

const openProfileStory =
    require(
        "../buttons/openProfileStory"
    );

const accessService =
    require(
        "./ProfileEditAccessService"
    );

const {
    readNormalizedField
} = require("./ProfileEditUtils");

const changeRequestManager =
    require(
        "../../managers/CharacterChangeRequestV2Manager"
    );

const changeRequestSubmissionService =
    require(
        "../../services/validation/ChangeRequestSubmissionService"
    );

const {
    deferPrivate,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

async function submitIdentity(
    interaction,
    characterId
) {
    const writable =
        await accessService
            .getWritableProfile(
                interaction,
                characterId
            );

    if (!writable) {
        return;
    }

    const changes =
        buildIdentityChanges(
            interaction,
            writable.dashboardData
        );

    if (
        await submitForReviewIfNeeded(
            interaction,
            writable,
            changeRequestManager.types
                .PROFILE_IDENTITY,
            changes
        )
    ) {
        return;
    }

    applyIdentityChanges(
        characterId,
        writable.continuityId,
        changes
    );

    if (
        await returnToCreationIfDraft(
            interaction,
            writable
        )
    ) {
        return;
    }

    return characterProfilePage
        .execute(
            interaction,
            characterId
        );
}

async function submitInformation(
    interaction,
    characterId
) {
    const writable =
        await accessService
            .getWritableProfile(
                interaction,
                characterId
            );

    if (!writable) {
        return;
    }

    const changes = {
        origin:
            readNormalizedField(
                interaction,
                "origin"
            ),
        occupation:
            readNormalizedField(
                interaction,
                "occupation"
            ),
        gang:
            readNormalizedField(
                interaction,
                "gang"
            ),
        height:
            readNormalizedField(
                interaction,
                "height"
            ),
        weight:
            readNormalizedField(
                interaction,
                "weight"
            )
    };

    if (
        await submitForReviewIfNeeded(
            interaction,
            writable,
            changeRequestManager.types
                .PROFILE_INFORMATION,
            changes
        )
    ) {
        return;
    }

    profileManager.update(
        writable.continuityId,
        changes
    );

    if (
        await returnToCreationIfDraft(
            interaction,
            writable
        )
    ) {
        return;
    }

    return characterProfilePage
        .execute(
            interaction,
            characterId
        );
}

async function submitAlias(
    interaction,
    characterId
) {
    const writable =
        await accessService
            .getWritableProfile(
                interaction,
                characterId
            );

    if (!writable) {
        return;
    }

    const changes = {
        alias:
            readNormalizedField(
                interaction,
                "alias"
            )
    };

    if (
        await submitForReviewIfNeeded(
            interaction,
            writable,
            changeRequestManager.types
                .PROFILE_ALIAS,
            changes
        )
    ) {
        return;
    }

    profileManager.update(
        writable.continuityId,
        changes
    );

    if (
        await returnToCreationIfDraft(
            interaction,
            writable
        )
    ) {
        return;
    }

    return characterProfilePage
        .execute(
            interaction,
            characterId
        );
}

async function submitStory(
    interaction,
    characterId
) {
    const writable =
        await accessService
            .getWritableProfile(
                interaction,
                characterId
            );

    if (!writable) {
        return;
    }

    const changes = {
        faceclaim:
            readNormalizedField(
                interaction,
                "faceclaim"
            ),
        story:
            readNormalizedField(
                interaction,
                "story"
            )
    };

    if (
        await submitForReviewIfNeeded(
            interaction,
            writable,
            changeRequestManager.types
                .PROFILE_STORY,
            changes
        )
    ) {
        return;
    }

    profileManager.update(
        writable.continuityId,
        changes
    );

    if (
        await returnToCreationIfDraft(
            interaction,
            writable
        )
    ) {
        return;
    }

    interaction.customId =
        `v2_profile_story_view:${characterId}:0`;

    return openProfileStory.execute(
        interaction
    );
}

async function submitForReviewIfNeeded(
    interaction,
    writable,
    requestType,
    changes
) {
    if (
        writable.installation.status !==
        "approved"
    ) {
        return false;
    }

    await deferPrivate(
        interaction
    );

    const result =
        await changeRequestSubmissionService
            .submit({
                installation:
                    writable.installation,
                character:
                    writable.dashboardData.character,
                continuityId:
                    writable.continuityId,
                requestType,
                changes,
                submittedBy:
                    interaction.user.id,
                guild:
                    interaction.guild
            });

    const content = [
            "🟡 Ta modification a été envoyée au staff pour validation.",
            "Les informations actuellement visibles restent inchangées jusqu’à sa décision.",
            `Salon de suivi : <#${result.validationChannel.id}>`
        ].join("\n");

    if (
        interaction.deferred
        && typeof interaction.editReply ===
            "function"
    ) {
        await interaction.editReply({
            content
        });
    } else {
        await replyPrivate(
            interaction,
            content
        );
    }

    return true;
}

async function returnToCreationIfDraft(
    interaction,
    writable
) {
    if (
        writable.installation.status !== "draft"
    ) {
        return false;
    }

    const {
        character,
        continuity
    } = writable.dashboardData;

    const hasAvatar = Boolean(
        writable.installation.local_avatar_url
        || character.avatar_url
    );

    const view = hasAvatar
        ? installationCreatedView.build(
            character,
            continuity,
            writable.installation,
            interaction.guild,
            {
                created: false
            }
        )
        : characterAvatarRequiredView.build(
            character,
            continuity,
            writable.installation,
            interaction.guild
        );

    if (interaction.message) {
        await interaction.update(view);
    } else {
        await replyPrivate(
            interaction,
            view
        );
    }

    return true;
}

function buildIdentityChanges(
    interaction,
    dashboardData
) {
    const character =
        dashboardData.character
        || {};

    const profile =
        dashboardData.profile
        || {};

    const usesSimpleForm = [
        "random",
        "pnj_reserve",
        "reserve_staff"
    ].includes(
        character.character_type
    );

    if (usesSimpleForm) {
        return {
            proxyName:
                readNormalizedField(
                    interaction,
                    "character_proxy_name"
                ),
            firstname:
                readNormalizedField(
                    interaction,
                    "profile_fullname"
                ),
            lastname:
                null,
            alias:
                profile.alias
                || null,
            age:
                profile.age
                || null
        };
    }

    return {
        proxyName:
            readNormalizedField(
                interaction,
                "character_proxy_name"
            ),
        alias:
            readNormalizedField(
                interaction,
                "profile_alias"
            ),
        firstname:
            readNormalizedField(
                interaction,
                "profile_firstname"
            ),
        lastname:
            readNormalizedField(
                interaction,
                "profile_lastname"
            ),
        age:
            readNormalizedField(
                interaction,
                "profile_age"
            )
    };
}

function applyIdentityChanges(
    characterId,
    continuityId,
    changes
) {
    characterManager.updateIdentity(
        characterId,
        {
            proxyName:
                changes.proxyName,
            baseFirstname:
                changes.firstname,
            baseLastname:
                changes.lastname
        }
    );

    profileManager.update(
        continuityId,
        {
            alias:
                changes.alias,
            firstname:
                changes.firstname,
            lastname:
                changes.lastname,
            age:
                changes.age
        }
    );
}

module.exports = {
    submitIdentity,
    submitAlias,
    submitInformation,
    submitStory
};
