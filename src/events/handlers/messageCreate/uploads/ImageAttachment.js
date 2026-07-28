async function getImageAttachment(
    message,
    {
        missingMessage,
        invalidMessage
    }
) {
    if (message.attachments.size === 0) {
        await message.reply(
            missingMessage
        );

        return null;
    }

    const attachment =
        message.attachments.first();

    if (!isImageAttachment(attachment)) {
        await message.reply(
            invalidMessage
        );

        return null;
    }

    return attachment;
}

function isImageAttachment(
    attachment
) {
    if (
        attachment.contentType
            ?.startsWith("image/")
    ) {
        return true;
    }

    const filename =
        String(
            attachment.name ||
            ""
        ).toLowerCase();

    return /\.(apng|avif|gif|jpe?g|png|webp)$/
        .test(filename);
}

module.exports = {
    getImageAttachment,
    isImageAttachment
};
