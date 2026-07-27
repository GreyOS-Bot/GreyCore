const installationMessageManager =
    require(
        "../../managers/InstallationMessageV2Manager"
    );

const notificationView =
    require(
        "../../views/validation/ValidationDecisionNotificationView"
    );

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "ValidationNotificationService"
    );

class ValidationNotificationService {

    async notifyApproval({
        client,
        playerId,
        installationId,
        characterName,
        guildName
    }) {
        if (!playerId) {
            return false;
        }

        const player =
            await client.users
                .fetch(
                    playerId
                )
                .catch(
                    () => null
                );

        if (!player) {
            return false;
        }

        return player
            .send(
                notificationView
                    .approved({
                        installationId,
                        characterName,
                        guildName
                    })
            )
            .then(
                () => true
            )
            .catch(
                error => {
                    logger.warn(
                        "Message privé de validation impossible.",
                        error
                    );

                    return false;
                }
            );
    }

    async notifyRejection({
        client,
        requesterId,
        installationId,
        characterName,
        guildName,
        reason
    }) {
        if (!requesterId) {
            return null;
        }

        const notification =
            notificationView
                .rejected({
                    installationId,
                    characterName,
                    guildName,
                    reason
                });

        const requester =
            await client.users
                .fetch(
                    requesterId
                )
                .catch(
                    () => null
                );

        if (requester) {
            const sent =
                await requester
                    .send(
                        notification
                    )
                    .then(
                        () => true
                    )
                    .catch(
                        error => {
                            logger.warn(
                                "Message privé de refus impossible.",
                                error
                            );

                            return false;
                        }
                    );

            if (sent) {
                return "direct_message";
            }
        }

        const installationMessage =
            installationMessageManager
                .getByInstallationId(
                    installationId
                );

        if (!installationMessage) {
            return null;
        }

        const channel =
            await client.channels
                .fetch(
                    installationMessage
                        .channel_id
                )
                .catch(
                    () => null
                );

        if (
            !channel
            || !channel.isTextBased()
        ) {
            return null;
        }

        const sent =
            await channel.send({
                content:
                    `<@${requesterId}>`,
                ...notification,
                allowedMentions: {
                    users: [
                        requesterId
                    ]
                }
            })
                .then(
                    () => true
                )
                .catch(
                    error => {
                        logger.warn(
                            "Notification de refus dans le salon impossible.",
                            error
                        );

                        return false;
                    }
                );

        return sent
            ? "installation_channel"
            : null;
    }

}

module.exports =
    new ValidationNotificationService();
