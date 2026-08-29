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

const logger = require(
    "../../../../v2/core/services/TechnicalLogger"
).create("OutfitUpload");
const {
    sanitizeError
} = require(
    "../../../../v2/core/services/TechnicalErrorSanitizer"
);

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
            logger.error(
                "❌ Erreur tenue V2 :",
                sanitizeError(error)
            );

            await message.reply(
                "❌ Le fichier de tenue n’a pas pu être traité."
            );
        }
    };
