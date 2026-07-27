const {
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

const guideView =
    require(
        "../v2/views/help/GettingStartedGuideView"
    );

function canSendInChannel(
    channel,
    guild
) {
    if (
        !channel
        || !channel.isTextBased()
    ) {
        return false;
    }

    if (
        typeof channel.permissionsFor !==
        "function"
    ) {
        return true;
    }

    const permissions =
        channel.permissionsFor(
            guild.members?.me
        );

    return Boolean(
        permissions?.has(
            PermissionFlagsBits.ViewChannel
        )
        && permissions.has(
            PermissionFlagsBits.SendMessages
        )
    );
}

function findWelcomeChannel(guild) {
    if (
        canSendInChannel(
            guild.systemChannel,
            guild
        )
    ) {
        return guild.systemChannel;
    }

    return [
        ...(guild.channels?.cache?.values()
            || [])
    ].find(channel =>
        channel.type === ChannelType.GuildText
        && canSendInChannel(
            channel,
            guild
        )
    );
}

module.exports = {
    name: "guildCreate",

    async execute(guild) {
        const channel =
            findWelcomeChannel(guild);

        if (!channel) {
            return;
        }

        try {
            await channel.send({
                ...guideView.build(),
                allowedMentions: {
                    parse: []
                }
            });
        } catch (error) {
            console.error(
                "Impossible d’envoyer le guide de démarrage :",
                error.message
            );
        }
    }
};
