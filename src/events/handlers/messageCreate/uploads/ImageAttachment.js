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

    if (
        !attachment.contentType
            ?.startsWith("image/")
    ) {
        await message.reply(
            invalidMessage
        );

        return null;
    }

    return attachment;
}

module.exports = {
    getImageAttachment
};
