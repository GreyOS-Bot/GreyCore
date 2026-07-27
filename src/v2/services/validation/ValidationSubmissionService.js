const v2 =
    require(
        "../../index"
    );

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "ValidationSubmissionService"
    );

const staffTrackingService =
    require(
        "./InstallationStaffTrackingService"
    );

class ValidationSubmissionService {

    async submit({
        installation,
        submittedBy,
        guild,
        validationChannel
    }) {
        let submitted =
            false;

        let validationMessage =
            null;

        try {
            const submissionResult =
                v2.managers.validation
                    .submitInstallation({
                        installationId:
                            installation.id,
                        submittedBy
                    });

            submitted =
                true;

            const validationData =
                v2.managers.validation
                    .getInstallationContext(
                        installation.id
                    );

            if (!validationData) {
                throw new Error(
                    "Impossible de préparer la carte de validation."
                );
            }

            try {
                validationMessage =
                    await staffTrackingService
                        .sync({
                            client:
                                guild.client,
                            guild,
                            installationId:
                                installation.id,
                            requesterId:
                                submittedBy,
                            validationChannel,
                            throwOnError:
                                true
                        });

                if (!validationMessage) {
                    throw new Error(
                        "Le salon du staff est inaccessible."
                    );
                }
            } catch (error) {
                throw new Error(
                    "Le message n’a pas pu être envoyé au salon du staff. L’installation est restée en brouillon ; tu peux réessayer."
                );
            }

            v2.managers.validation
                .storeValidationMessage({
                    installationId:
                        installation.id,
                    channelId:
                        validationChannel.id,
                    messageId:
                        validationMessage.id
                });

            return {
                submissionResult,
                validationData,
                validationMessage
            };
        } catch (error) {
            if (submitted) {
                v2.managers.validation
                    .cancelSubmission({
                        installationId:
                            installation.id
                    });
            }

            if (validationMessage) {
                const restoredMessage =
                    await staffTrackingService
                        .sync({
                            client:
                                guild.client,
                            guild,
                            installationId:
                                installation.id,
                            requesterId:
                                submittedBy,
                            validationChannel
                        });

                if (!restoredMessage) {
                    await validationMessage
                        .edit({
                            content:
                                "⚠️ Cette demande n’a pas pu être enregistrée. Le joueur peut la renvoyer.",
                            embeds: [],
                            components: []
                        })
                        .catch(
                            editError =>
                                logger.warn(
                                    "Impossible de restaurer la carte de suivi.",
                                    editError
                                )
                        );
                }
            }

            throw error;
        }
    }

}

module.exports =
    new ValidationSubmissionService();
