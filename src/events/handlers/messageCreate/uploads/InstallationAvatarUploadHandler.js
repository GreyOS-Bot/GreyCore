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

const changeRequestManager =
    require(
        "../../../../v2/managers/CharacterChangeRequestV2Manager"
    );

const changeRequestSubmissionService =
    require(
        "../../../../v2/services/validation/ChangeRequestSubmissionService"
    );

const {
    getImageAttachment
} = require("./ImageAttachment");

const avatarCropService =
    require(
        "../../../../v2/services/media/AvatarCropService"
    );

module.exports =
    async function installationAvatarUploadHandler(
        message,
        pendingAction
    ) {
        const attachment =
            await getImageAttachment(
                message,
                {
                    missingMessage:
                        "❌ Envoie une image pour définir l’avatar de cette installation.",
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
                installation.character_id
                    !== character.id
                ||
                installation.continuity_id
                    !== continuity.id
                ||
                installation.guild_id
                    !== message.guild?.id
                ||
                character.discord_user_id
                    !== message.author.id
            ) {
                pendingActionManager.delete(
                    message.author.id
                );

                await message.reply(
                    "❌ Cette installation est introuvable ou ne t’appartient pas."
                );

                return;
            }

            const croppedAvatarUrl =
                await avatarCropService
                    .cropAndStore(
                        message,
                        attachment
                    );

            if (installation.status === "approved") {
                const result =
                    await changeRequestSubmissionService
                        .submit({
                            installation,
                            character,
                            continuityId:
                                continuity.id,
                            requestType:
                                changeRequestManager.types
                                    .AVATAR,
                            changes: {
                                avatarUrl:
                                    croppedAvatarUrl
                            },
                            submittedBy:
                                message.author.id,
                            guild:
                                message.guild
                        });

                pendingActionManager.delete(
                    message.author.id
                );

                await message.reply(
                    [
                        "🟡 Le nouvel avatar a été envoyé au staff pour validation.",
                        "L’avatar actuellement visible reste utilisé jusqu’à sa décision.",
                        `Salon de suivi : <#${result.validationChannel.id}>`
                    ].join("\n")
                );

                return;
            }

            const updatedInstallation =
                installationManager
                    .setLocalAvatar(
                        installation.id,
                        croppedAvatarUrl
                    );

            pendingActionManager.delete(
                message.author.id
            );

            await staffTrackingService
                .sync({
                    client:
                        message.client,
                    guild:
                        message.guild,
                    installationId:
                        updatedInstallation.id,
                    requesterId:
                        message.author.id
                });

            await message.reply(
                installationCreatedView
                    .build(
                        character,
                        continuity,
                        updatedInstallation,
                        message.guild
                    )
            );
        } catch (error) {
            console.error(
                "❌ Erreur avatar local installation V2 :",
                error
            );

            await message.reply(
                `❌ ${
                    error.message
                    ||
                    "Impossible d’enregistrer l’avatar de cette installation."
                }`
            );
        }
    };
