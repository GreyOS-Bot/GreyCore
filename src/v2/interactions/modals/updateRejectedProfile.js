const v2 =
    require(
        "../../index"
    );

const contextService =
    require(
        "../../services/validation/RejectedProfileContextService"
    );

const rejectedProfileView =
    require(
        "../../views/validation/RejectedProfileView"
    );

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "updateRejectedProfile"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    try {
        const installationId =
            interaction.customId
                .split(":")[1];

        const context =
            contextService
                .resolve(
                    interaction,
                    installationId
                );

        if (context.error) {
            return replyError(
                interaction,
                context.error
            );
        }

        const profile =
            readProfile(
                interaction
            );

        if (profile.error) {
            return replyError(
                interaction,
                profile.error
            );
        }

        saveProfile(
            context.continuity.id,
            context.profile,
            profile
        );

        const wasSuspended =
            context.installation.status ===
            "suspended";

        if (wasSuspended) {
            v2.managers.validation
                .reopenInstallation({
                    installationId
                });
        }

        return replyPrivate(
            interaction,
            rejectedProfileView
                .updated(
                    context.character,
                    installationId,
                    wasSuspended
                )
        );
    } catch (error) {
        logger.error(
            "Erreur de modification de la fiche refusée.",
            error
        );

        return replyError(
            interaction,
            error
        );
    }
};

function readProfile(
    interaction
) {
    const getValue =
        fieldId =>
            interaction.fields
                .getTextInputValue(
                    fieldId
                )
                .trim();

    const ageValue =
        getValue(
            "age"
        );

    let age =
        null;

    if (ageValue) {
        age =
            Number(
                ageValue
            );

        if (
            !Number.isInteger(age)
            || age < 0
            || age > 999
        ) {
            return {
                error:
                    "L’âge doit être un nombre valide."
            };
        }
    }

    return {
        firstname:
            getValue(
                "firstname"
            )
            || null,
        lastname:
            getValue(
                "lastname"
            )
            || null,
        age,
        alias:
            getValue(
                "alias"
            )
            || null,
        story:
            getValue(
                "story"
            )
            || null
    };
}

function saveProfile(
    continuityId,
    currentProfile,
    profile
) {
    if (currentProfile) {
        return v2.managers.profile
            .update(
                continuityId,
                profile
            );
    }

    return v2.managers.profile
        .create({
            continuityId,
            ...profile
        });
}
