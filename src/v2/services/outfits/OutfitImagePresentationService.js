const path = require("node:path");

function getAttachment(outfit) {
    if (!outfit?.image_data) {
        return null;
    }

    const extension = path.extname(
        String(outfit.image_filename || "")
    ) || ".png";

    const filename =
        `greycore-outfit-${outfit.id}${extension}`;

    return {
        attachment: outfit.image_data,
        name: filename
    };
}

function getImageUrl(outfit, attachment) {
    return attachment
        ? `attachment://${attachment.name}`
        : outfit?.image_url || null;
}

module.exports = {
    getAttachment,
    getImageUrl
};
