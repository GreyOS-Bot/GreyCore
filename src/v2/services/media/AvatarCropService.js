const sharp = require("sharp");

const logger = require(
    "../../core/services/TechnicalLogger"
).create("AvatarCropService");

const OUTPUT_SIZE = 512;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

class AvatarCropService {
    async cropAndStore(
        message,
        attachment
    ) {
        try {
            return await this.processAndStore(
                message,
                attachment
            );
        } catch (error) {
            /*
             * Un problème de recadrage ne doit jamais bloquer la
             * création du personnage. Le lien original reste alors
             * utilisable, comme avant l'ajout de cette fonctionnalité.
             */
            logger.warn(
                "⚠️ Recadrage d’avatar impossible, image originale conservée :",
                error.message
            );

            return attachment.url;
        }
    }

    async processAndStore(
        message,
        attachment
    ) {
        const response = await fetch(
            attachment.url,
            {
                signal:
                    AbortSignal.timeout(15000)
            }
        );

        if (!response.ok) {
            throw new Error(
                "Impossible de télécharger l’avatar envoyé."
            );
        }

        const source = Buffer.from(
            await response.arrayBuffer()
        );

        if (source.length > MAX_SOURCE_BYTES) {
            throw new Error(
                "L’image dépasse la taille maximale autorisée (15 Mo)."
            );
        }

        const cropped = await sharp(source, {
            failOn: "warning"
        })
            .rotate()
            .resize(
                OUTPUT_SIZE,
                OUTPUT_SIZE,
                {
                    fit: "cover",
                    position: "attention"
                }
            )
            .webp({
                quality: 90,
                effort: 4
            })
            .toBuffer();

        const storedMessage =
            await message.channel.send({
                content:
                    "🖼️ Avatar recadré automatiquement au format carré.",
                files: [
                    {
                        attachment: cropped,
                        name:
                            `greycore-avatar-${Date.now()}.webp`
                    }
                ],
                allowedMentions: {
                    parse: []
                }
            });

        const storedAttachment =
            storedMessage.attachments.first();

        if (!storedAttachment?.url) {
            throw new Error(
                "Impossible de conserver l’avatar recadré."
            );
        }

        return storedAttachment.url;
    }
}

module.exports = new AvatarCropService();
