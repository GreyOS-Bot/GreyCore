const pendingActionManager =
    require(
        "../../../../v2/managers/PendingActionManager"
    );

const characterManager =
    require(
        "../../../../v2/managers/CharacterV2Manager"
    );

const continuityManager =
    require(
        "../../../../v2/managers/ContinuityV2Manager"
    );

const installationManager =
    require(
        "../../../../v2/managers/InstallationV2Manager"
    );

const installationCreatedView =
    require(
        "../../../../v2/views/deployment/InstallationCreatedView"
    );

const staffTrackingService =
    require(
        "../../../../v2/services/validation/InstallationStaffTrackingService"
    );

const {
    getImageAttachment
} = require("./ImageAttachment");

const avatarCropService =
    require(
        "../../../../v2/services/media/AvatarCropService"
    );

const logger = require(
    "../../../../v2/core/services/TechnicalLogger"
).create("CharacterAvatarUpload");
const {
    sanitizeError
} = require(
    "../../../../v2/core/services/TechnicalErrorSanitizer"
);

module.exports =
    async function characterAvatarUploadHandler(
        message,
        pendingAction
    ) {
        const attachment =
            await getImageAttachment(
                message,
                {
                    missingMessage:
                        "❌ Envoie une image pour définir l’avatar du personnage.",
                    invalidMessage:
                        "❌ Le fichier envoyé doit être une image."
                }
            );

        if (!attachment) {
            return;
        }

        try {
            const character =
                characterManager.getById(
                    pendingAction.characterId
                );

            const continuity =
                continuityManager.getById(
                    pendingAction.continuityId
                );

            const installation =
                installationManager.getById(
                    pendingAction.installationId
                );

            if (
                !character
                ||
                !continuity
                ||
                !installation
                ||
                character.discord_user_id
                    !== message.author.id
            ) {
                pendingActionManager.delete(
                    message.author.id
                );

                await message.reply(
                    "❌ La création concernée est introuvable ou ne t’appartient pas."
                );

                return;
            }

            const updatedCharacter =
                characterManager.updateIdentity(
                    character.id,
                    {
                        avatarUrl:
                            await avatarCropService
                                .cropAndStore(
                                    message,
                                    attachment
                                )
                    }
                );

            const updatedInstallation =
                installationManager
                    .setLocalAvatar(
                        installation.id,
                        updatedCharacter
                            .avatar_url
                    );

            pendingActionManager.delete(
                message.author.id
            );

            const installationGuild =
                message.guild
                ||
                await message.client.guilds
                    .fetch(
                        installation.guild_id
                    )
                    .catch(
                        () => ({
                            id:
                                installation.guild_id,
                            name:
                                "le serveur concerné"
                        })
                    );

            await staffTrackingService
                .sync({
                    client:
                        message.client,
                    guild:
                        installationGuild,
                    installationId:
                        updatedInstallation.id,
                    requesterId:
                        message.author.id
                });

            await message.reply(
                installationCreatedView
                    .build(
                        updatedCharacter,
                        continuity,
                        updatedInstallation,
                        installationGuild
                    )
            );
        } catch (error) {
            logger.error(
                "❌ Erreur avatar personnage V2 :",
                sanitizeError(error)
            );

            await message.reply(
                "❌ Le fichier d’avatar n’a pas pu être traité."
            );
        }
    };
