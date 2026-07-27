const changeRequestManager =
    require(
        "../../managers/CharacterChangeRequestV2Manager"
    );

const guildSettingsManager =
    require(
        "../../managers/GuildSettingsV2Manager"
    );

const cardBuilder =
    require(
        "../../builders/CharacterChangeRequestCardBuilder"
    );

class ChangeRequestSubmissionService {
    async submit({
        installation,
        character,
        continuityId,
        requestType,
        changes,
        submittedBy,
        guild
    }) {
        if (!guild) {
            throw new Error(
                "La demande de modification doit être faite depuis le serveur concerné."
            );
        }

        const validationChannelId =
            guildSettingsManager
                .getValidationChannelId(
                    guild.id
                );

        if (!validationChannelId) {
            throw new Error(
                "Aucun salon de validation n’est configuré sur ce serveur."
            );
        }

        const validationChannel =
            await guild.channels.fetch(
                validationChannelId
            ).catch(() => null);

        if (
            !validationChannel
            || !validationChannel.isTextBased()
        ) {
            throw new Error(
                "Le salon de validation configuré est introuvable ou inaccessible."
            );
        }

        const request =
            changeRequestManager.create({
                installationId:
                    installation.id,
                characterId:
                    character.id,
                continuityId,
                requestType,
                changes,
                submittedBy
            });

        try {
            const context =
                changeRequestManager.getContext(
                    request.id
                );

            const validationMessage =
                await validationChannel.send(
                    cardBuilder.build(
                        context,
                        guild.name
                    )
                );

            const storedRequest =
                changeRequestManager
                    .storeValidationMessage({
                        requestId:
                            request.id,
                        channelId:
                            validationChannel.id,
                        messageId:
                            validationMessage.id
                    });

            return {
                request:
                    storedRequest,
                validationChannel
            };
        } catch (error) {
            changeRequestManager.cancel(
                request.id
            );

            throw error;
        }
    }
}

module.exports =
    new ChangeRequestSubmissionService();
