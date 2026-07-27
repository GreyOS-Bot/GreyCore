const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "createCharacterV2"
    );

const characterCreationService =
    require(
        "../../services/character/CharacterCreationV2Service"
    );

const characterAvatarRequiredView =
    require(
        "../../views/character/CharacterAvatarRequiredView"
    );

const pendingActionManager =
    require(
        "../../managers/PendingActionManager"
    );

const staffTrackingService =
    require(
        "../../services/validation/InstallationStaffTrackingService"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function createCharacterV2(
        interaction
    ) {

        try {

            if (!interaction.guild) {
                throw new Error(
                    "La création doit être effectuée depuis un serveur."
                );
            }

            const type =
                interaction.customId
                    .split(":")[1];

            const result =
                characterCreationService.create({
                    discordUserId:
                        interaction.user.id,
                    guildId:
                        interaction.guild.id,
                    guildName:
                        interaction.guild.name,
                    type,
                    proxyName:
                        interaction.fields
                            .getTextInputValue(
                                "character_proxy_name"
                            ),
                    fullName:
                        readField(
                            interaction,
                            "profile_fullname"
                        ),
                    age:
                        readField(
                            interaction,
                            "profile_age"
                        ),
                    gang:
                        readField(
                            interaction,
                            "profile_gang"
                        ),
                    story:
                        readField(
                            interaction,
                            "profile_story"
                        )
                });

            pendingActionManager.create({
                userId:
                    interaction.user.id,
                type:
                    "character_avatar_upload",
                guildId:
                    interaction.guild.id,
                channelId:
                    interaction.channelId,
                characterId:
                    result.character.id,
                continuityId:
                    result.continuity.id,
                installationId:
                    result.installation.id
            });

            await staffTrackingService
                .sync({
                    client:
                        interaction.client,
                    guild:
                        interaction.guild,
                    installationId:
                        result.installation.id,
                    requesterId:
                        interaction.user.id
                });

            const view =
                characterAvatarRequiredView.build(
                    result.character,
                    result.continuity,
                    result.installation,
                    interaction.guild
                );

            if (interaction.message) {
                return interaction.update(
                    view
                );
            }

            return replyPrivate(
                interaction,
                view
            );

        } catch (error) {

            logger.error(
                "❌ Erreur création personnage V2 :",
                error
            );

            return replyError(
                interaction,
                error.message
                || "Impossible de créer le personnage."
            );

        }

    };

function readField(
    interaction,
    fieldId
) {
    try {
        return interaction.fields
            .getTextInputValue(fieldId);
    } catch (error) {
        return "";
    }
}
