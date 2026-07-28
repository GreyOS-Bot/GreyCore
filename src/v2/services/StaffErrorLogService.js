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
                await this.getChannel(channelId);

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
                "Impossible d'envoyer le journal staff :",
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
            name: "Erreur",
            value: toCodeBlock(
                getErrorSummary(error),
                1_024
            ),
            inline: false
        },
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

    const channel = getChannel(interaction);

    if (channel) {
        fields.push({
            name: "Salon concern\u00e9",
            value: truncate(channel, 1_024),
            inline: true
        });
    }

    const guild = getGuild(interaction);

    if (guild) {
        fields.push({
            name: "Serveur",
            value: truncate(guild, 1_024),
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

    const trace = getTechnicalTrace(error);

    if (trace) {
        fields.push({
            name: "Trace technique",
            value: toCodeBlock(trace, 1_024),
            inline: false
        });
    }

    return new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("\u26a0\ufe0f Erreur GreyCore")
        .setDescription(
            "GreyCore a interrompu une action. Les d\u00e9tails ci-dessous permettent au staff de la reproduire et de la corriger."
        )
        .addFields(fields)
        .setTimestamp();
}

function getErrorSummary(error) {
    const name =
        error?.name
        || "Erreur";
    const code =
        error?.code
            ? ` [${error.code}]`
            : "";

    return `${name}${code}: ${getErrorMessage(error)}`;
}

function getErrorMessage(error) {
    const message =
        error instanceof Error
            ? error.message
            : error;

    return String(
        message
        || "Erreur inconnue."
    ).replace(/`/g, "'");
}

function getTechnicalTrace(error) {
    if (!error?.stack) {
        return null;
    }

    const trace =
        String(error.stack)
            .replace(/`/g, "'")
            .trim();

    return trace || null;
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

function getChannel(interaction) {
    const channel =
        interaction?.channel;
    const channelId =
        interaction?.channelId
        || channel?.id;

    if (!channel && !channelId) {
        return null;
    }

    const name =
        channel?.name
            ? `#${channel.name}`
            : "Salon inconnu";

    return channelId
        ? `${name} (${channelId})`
        : name;
}

function getGuild(interaction) {
    const guild =
        interaction?.guild;
    const guildId =
        interaction?.guildId
        || guild?.id;

    if (!guild && !guildId) {
        return null;
    }

    const name =
        guild?.name
        || "Serveur inconnu";

    return guildId
        ? `${name} (${guildId})`
        : name;
}

function getUser(interaction) {
    if (!interaction?.user) {
        return null;
    }

    const name =
        interaction.user.tag
        || interaction.user.username
        || "Utilisateur inconnu";

    return interaction.user.id
        ? `${name} (${interaction.user.id})`
        : name;
}

function toCodeBlock(value, maximum) {
    const content =
        truncate(value, maximum - 6);

    return `\`\`\`${content}\`\`\``;
}

function truncate(value, maximum) {
    const text = String(value || "").trim();

    if (text.length <= maximum) {
        return text || "Non pr\u00e9cis\u00e9";
    }

    return `${text.slice(0, maximum - 1)}\u2026`;
}

const service = new StaffErrorLogService();

module.exports = service;
module.exports.StaffErrorLogService =
    StaffErrorLogService;
module.exports.buildErrorEmbed = buildErrorEmbed;
