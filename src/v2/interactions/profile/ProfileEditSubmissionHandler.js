const profileManager =
    require(
        "../../managers/ProfileV2Manager"
    );

const characterProfilePage =
    require(
        "../../pages/character/CharacterProfilePage"
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

    const changes = {
        firstname:
            readNormalizedField(
                interaction,
                "firstname"
            ),
        lastname:
            readNormalizedField(
                interaction,
                "lastname"
            ),
        age:
            readNormalizedField(
                interaction,
                "age"
            ),
        birthday:
            readNormalizedField(
                interaction,
                "birthday"
            ),
        gender:
            readNormalizedField(
                interaction,
                "gender"
            )
    };

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

    profileManager.update(
        writable.continuityId,
        changes
    );

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

    await replyPrivate(
        interaction,
        [
            "🟡 Ta modification a été envoyée au staff pour validation.",
            "Les informations actuellement visibles restent inchangées jusqu’à sa décision.",
            `Salon de suivi : <#${result.validationChannel.id}>`
        ].join("\n")
    );

    return true;
}

module.exports = {
    submitIdentity,
    submitInformation,
    submitStory
};
