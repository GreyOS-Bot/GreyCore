const {
    EmbedBuilder
} = require("discord.js");

const guildSettingsManager =
    require("../managers/GuildSettingsV2Manager");

const logger =
    require("../core/services/TechnicalLogger")
        .create("StaffErrorLogService");

class StaffErrorLogService {

    constructor({
        settingsManager = guildSettingsManager,
        log = logger
    } = {}) {
        this.settingsManager = settingsManager;
        this.log = log;
        this.client = null;
    }

    initialize(client) {
        this.client = client;
    }

    async report({
        guildId,
        scope,
        error,
        interaction = null
    }) {
        if (!guildId || !this.client) {
            return false;
        }

        const channelId =
            this.settingsManager
                .getErrorLogChannelId(
                    guildId
                );

        if (!channelId) {
            return false;
        }

        try {
            const channel =
                await this.getChannel(
                    channelId
                );

            if (
                !channel
                || typeof channel.send !== "function"
            ) {
                return false;
            }

            await channel.send({
                embeds: [
                    buildErrorEmbed({
                        scope,
                        error,
                        interaction
                    })
                ]
            });

            return true;
        } catch (reportError) {
            this.log.warn(
                "Impossible d’envoyer le journal staff :",
                reportError
            );

            return false;
        }
    }

    async getChannel(channelId) {
        const cached =
            this.client.channels.cache?.get(
                channelId
            );

        if (cached) {
            return cached;
        }

        return this.client.channels
            .fetch(channelId)
            .catch(() => null);
    }

}

function buildErrorEmbed({
    scope,
    error,
    interaction
}) {
    const fields = [
        {
            name: "Origine",
            value: truncate(
                scope
                || "Interaction Discord",
                1_024
            ),
            inline: true
        }
    ];

    const action = getAction(interaction);

    if (action) {
        fields.push({
            name: "Action",
            value: truncate(action, 1_024),
            inline: true
        });
    }

    const user = getUser(interaction);

    if (user) {
        fields.push({
            name: "Utilisateur",
            value: truncate(user, 1_024),
            inline: true
        });
    }

    return new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("⚠️ Erreur GreyCore")
        .setDescription(
            `\`\`\`${truncate(getErrorMessage(error), 1_500)}\`\`\``
        )
        .addFields(fields)
        .setTimestamp();
}

function getErrorMessage(error) {
    return String(
        error instanceof Error
            ? error.message
            : error
            || "Erreur inconnue."
    ).replace(/`/g, "’");
}

function getAction(interaction) {
    if (!interaction) {
        return null;
    }

    return (
        interaction.commandName
        || interaction.customId
        || interaction.type
        || null
    );
}

function getUser(interaction) {
    if (!interaction?.user) {
        return null;
    }

    return (
        interaction.user.tag
        || interaction.user.username
        || interaction.user.id
        || null
    );
}

function truncate(value, maximum) {
    const text = String(value || "").trim();

    if (text.length <= maximum) {
        return text || "Non précisé";
    }

    return `${text.slice(0, maximum - 1)}…`;
}

const service = new StaffErrorLogService();

module.exports = service;
module.exports.StaffErrorLogService =
    StaffErrorLogService;
module.exports.buildErrorEmbed = buildErrorEmbed;
