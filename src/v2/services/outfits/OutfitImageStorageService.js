const path = require("node:path");

const IMAGE_EXTENSIONS = new Set([
    ".apng",
    ".avif",
    ".gif",
    ".jpeg",
    ".jpg",
    ".png",
    ".webp"
]);

class OutfitImageStorageService {
    isImage(attachment) {
        if (
            attachment?.contentType
                ?.startsWith("image/")
        ) {
            return true;
        }

        const extension = path.extname(
            String(attachment?.name || "")
        ).toLowerCase();

        return IMAGE_EXTENSIONS.has(extension);
    }

    async download(attachment) {
        if (!this.isImage(attachment)) {
            throw new Error(
                "Le fichier doit \u00eatre une image."
            );
        }

        const imageUrl = String(attachment.url || "").trim();

        if (!imageUrl) {
            throw new Error(
                "L'image envoy\u00e9e est introuvable."
            );
        }

        const response = await fetch(imageUrl);

        if (!response.ok) {
            throw new Error(
                "L'image n'a pas pu \u00eatre enregistr\u00e9e."
            );
        }

        const data = Buffer.from(
            await response.arrayBuffer()
        );

        if (!data.length) {
            throw new Error(
                "L'image envoy\u00e9e est vide."
            );
        }

        return {
            data,
            filename:
                this.getFilename(attachment),
            contentType:
                String(
                    attachment.contentType
                    || response.headers.get(
                        "content-type"
                    )
                    || ""
                ).trim()
                || null
        };
    }

    getFilename(attachment) {
        const original = path.basename(
            String(attachment.name || "outfit-image")
        );

        return original || "outfit-image";
    }
}

module.exports =
    new OutfitImageStorageService();
