const guildSettingsManager =
    require(
        "../../managers/GuildSettingsV2Manager"
    );

const installationMessageManager =
    require(
        "../../managers/InstallationMessageV2Manager"
    );

const validationManager =
    require(
        "./ValidationManagerV2"
    );

const validationCardBuilder =
    require(
        "../../builders/ValidationCardBuilder"
    );

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "InstallationStaffTrackingService"
    );

class InstallationStaffTrackingService {

    async sync({
        client,
        guild,
        installationId,
        requesterId = null,
        validationChannel = null,
        throwOnError = false
    }) {
        try {
            return await this
                .syncOrThrow({
                    client,
                    guild,
                    installationId,
                    requesterId,
                    validationChannel
                });
        } catch (error) {
            logger.warn(
                "Impossible de mettre à jour le suivi staff.",
                {
                    installationId,
                    error:
                        error.message
                }
            );

            if (throwOnError) {
                throw error;
            }

            return null;
        }
    }

    async syncOrThrow({
        client,
        guild,
        installationId,
        requesterId,
        validationChannel
    }) {
        if (!guild) {
            throw new Error(
                "Le serveur du suivi staff est introuvable."
            );
        }

        const installation =
            validationManager
                .getInstallationContext(
                    installationId
                );

        if (!installation) {
            throw new Error(
                "L’installation du suivi staff est introuvable."
            );
        }

        const channel =
            validationChannel
            || await this
                .getConfiguredChannel({
                    client,
                    guild
                });

        if (!channel) {
            return null;
        }

        if (
            channel.isTextBased
            && !channel.isTextBased()
        ) {
            throw new Error(
                "Le salon de suivi staff n’est pas textuel."
            );
        }

        const ownerId =
            requesterId
            || installation.submitted_by
            || installation.owner_id
            || null;

        const card =
            validationCardBuilder
                .build({
                    installation,
                    guildName:
                        guild.name,
                    requesterDisplay:
                        ownerId
                            ? `<@${ownerId}>`
                            : "Utilisateur inconnu"
                });

        const storedMessage =
            installationMessageManager
                .getByInstallationId(
                    installationId
                );

        let message =
            null;

        if (
            storedMessage
            && String(
                storedMessage.channel_id
            ) ===
                String(channel.id)
        ) {
            message =
                await this
                    .fetchMessage(
                        channel,
                        storedMessage
                            .message_id
                    );
        }

        if (message) {
            await message.edit(
                card
            );
        } else {
            message =
                await channel.send(
                    card
                );
        }

        installationMessageManager
            .save({
                installationId,
                guildId:
                    guild.id,
                channelId:
                    channel.id,
                messageId:
                    message.id
            });

        return message;
    }

    async getConfiguredChannel({
        client,
        guild
    }) {
        const channelId =
            guildSettingsManager
                .getValidationChannelId(
                    guild.id
                );

        if (!channelId) {
            return null;
        }

        const cachedChannel =
            guild.channels
                ?.cache
                ?.get(
                    channelId
                )
            || client
                ?.channels
                ?.cache
                ?.get(
                    channelId
                )
            || null;

        if (cachedChannel) {
            return cachedChannel;
        }

        if (
            guild.channels
                ?.fetch
        ) {
            return guild.channels
                .fetch(
                    channelId
                )
                .catch(
                    () => null
                );
        }

        if (
            client
                ?.channels
                ?.fetch
        ) {
            return client.channels
                .fetch(
                    channelId
                )
                .catch(
                    () => null
                );
        }

        return null;
    }

    async fetchMessage(
        channel,
        messageId
    ) {
        if (
            !channel.messages
                ?.fetch
        ) {
            return null;
        }

        return channel.messages
            .fetch(
                messageId
            )
            .catch(
                () => null
            );
    }

}

module.exports =
    new InstallationStaffTrackingService();
