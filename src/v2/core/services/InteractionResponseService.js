const {
    MessageFlags
} = require("discord.js");

function canUseEphemeral(
    interaction
) {
    if (
        typeof interaction.inGuild ===
        "function"
    ) {
        return Boolean(
            interaction.inGuild()
        );
    }

    return Boolean(
        interaction.guildId
        || interaction.guild
    );
}

function privatePayload(
    interaction,
    contentOrPayload,
    extra = {}
) {
    const payload =
        typeof contentOrPayload ===
        "string"
            ? {
                content:
                    contentOrPayload
            }
            : {
                ...contentOrPayload
            };

    Object.assign(
        payload,
        extra
    );

    delete payload.ephemeral;

    if (
        canUseEphemeral(
            interaction
        )
    ) {
        payload.flags =
            MessageFlags.Ephemeral;
    } else {
        delete payload.flags;
    }

    return payload;
}

async function replyPrivate(
    interaction,
    contentOrPayload,
    extra = {}
) {
    const payload =
        privatePayload(
            interaction,
            contentOrPayload,
            extra
        );

    if (
        (
            interaction.deferred
            || interaction.replied
        )
        && typeof interaction.followUp ===
            "function"
    ) {
        return interaction.followUp(
            payload
        );
    }

    return interaction.reply(
        payload
    );
}

function deferPrivate(interaction) {
    if (
        interaction.deferred
        || interaction.replied
        || typeof interaction.deferReply !==
            "function"
    ) {
        return Promise.resolve();
    }

    const payload = {};

    if (canUseEphemeral(interaction)) {
        payload.flags =
            MessageFlags.Ephemeral;
    }

    return interaction.deferReply(payload);
}

function replyError(
    interaction,
    message,
    extra = {}
) {
    const rawMessage =
        message instanceof Error
            ? message.message
            : String(
                message
                || "Une erreur est survenue."
            );

    const content =
        rawMessage
            .trim()
            .startsWith("❌")
            ? rawMessage
            : `❌ ${rawMessage}`;

    return replyPrivate(
        interaction,
        content,
        extra
    );
}

function errorPayload(
    message,
    extra = {}
) {
    const rawMessage =
        message instanceof Error
            ? message.message
            : String(
                message
                || "Une erreur est survenue."
            );

    return {
        content:
            rawMessage
                .trim()
                .startsWith("❌")
                ? rawMessage
                : `❌ ${rawMessage}`,
        ...extra
    };
}

function editOrReplyError(
    interaction,
    message,
    extra = {}
) {
    if (
        (
            interaction.deferred
            || interaction.replied
        )
        && typeof interaction.editReply ===
            "function"
    ) {
        return interaction.editReply(
            privatePayload(
                interaction,
                errorPayload(
                    message,
                    extra
                )
            )
        );
    }

    return replyError(
        interaction,
        message,
        extra
    );
}

function updateError(
    interaction,
    message,
    extra = {
        embeds: [],
        components: []
    }
) {
    const payload =
        errorPayload(
            message,
            extra
        );

    if (
        (
            interaction.deferred
            || interaction.replied
        )
        && typeof interaction.editReply ===
            "function"
    ) {
        return interaction.editReply(
            payload
        );
    }

    if (
        typeof interaction.update ===
        "function"
    ) {
        return interaction.update(
            payload
        );
    }

    return replyError(
        interaction,
        message,
        extra
    );
}

module.exports = {
    canUseEphemeral,
    privatePayload,
    deferPrivate,
    replyPrivate,
    replyError,
    errorPayload,
    editOrReplyError,
    updateError
};
