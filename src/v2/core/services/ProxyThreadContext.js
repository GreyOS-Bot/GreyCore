function getThreadId(
    channel
) {
    if (
        typeof channel?.isThread !==
        "function"
        || !channel.isThread()
    ) {
        return null;
    }

    return channel.id || null;
}

function withThreadId(
    channel,
    payload
) {
    const threadId =
        getThreadId(
            channel
        );

    if (!threadId) {
        return payload;
    }

    return {
        ...payload,
        threadId
    };
}

module.exports = {
    getThreadId,
    withThreadId
};
