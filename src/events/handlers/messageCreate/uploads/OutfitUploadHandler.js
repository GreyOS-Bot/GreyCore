const pendingActionManager =
    require(
        "../../../../v2/managers/PendingActionManager"
    );

const outfitManager =
    require(
        "../../../../v2/managers/OutfitV2Manager"
    );

const {
    getImageAttachment
} = require("./ImageAttachment");

module.exports =
    async function outfitUploadHandler(
        message,
        pendingAction
    ) {
        const attachment =
            await getImageAttachment(
                message,
                {
                    missingMessage:
                        "❌ Envoie une image.",
                    invalidMessage:
                        "❌ Le fichier doit être une image."
                }
            );

        if (!attachment) {
            return;
        }

        try {
            outfitManager.createCurrent({
                continuityId:
                    pendingAction.continuityId,
                imageUrl:
                    attachment.url
            });

            pendingActionManager.delete(
                message.author.id
            );

            await message.reply({
                content:
`✅ Tenue enregistrée !

Titre : *aucun*

Description : *aucune*

La tenue est maintenant active.`
            });
        } catch (error) {
            console.error(
                "❌ Erreur tenue V2 :",
                error
            );

            await message.reply(
                `❌ ${error.message}`
            );
        }
    };
