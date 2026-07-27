const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const validationManager =
    require(
        "../../v2/services/validation/ValidationManagerV2"
    );

const {
    requireStaffCommandAccess
} = require(
    "../../v2/core/services/StaffCommandAccessService"
);

const {
    replyPrivate
} = require(
    "../../v2/core/services/InteractionResponseService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("validations")
        .setDescription(
            "Consulte les demandes de validation du serveur."
        )
        .addSubcommand(sub =>
            sub
                .setName("attente")
                .setDescription(
                    "Affiche les demandes actuellement en attente."
                )
        ),

    async execute(interaction) {
        if (
            !await requireStaffCommandAccess(
                interaction
            )
        ) {
            return;
        }

        const pending =
            validationManager
                .getPendingForGuild(
                    interaction.guildId
                );

        return replyPrivate(
            interaction,
            buildPendingView(
                interaction.guildId,
                pending
            )
        );
    }
};

function buildPendingView(
    guildId,
    pending
) {
    const descriptions =
        pending.length
            ? splitDescriptions(
                pending.map(
                    installation =>
                        formatPendingInstallation(
                            guildId,
                            installation
                        )
                )
            )
            : [
                "Aucune demande n’attend une décision du staff."
            ];

    return {
        embeds: descriptions.map(
            (
                description,
                index
            ) => new EmbedBuilder()
                .setColor(
                    pending.length
                        ? 0xFEE75C
                        : 0x57F287
                )
                .setTitle(
                    "📋 Validations en attente"
                )
                .setDescription(description)
                .setFooter({
                    text: pending.length
                        ? `${pending.length} demande(s) à traiter${descriptions.length > 1 ? ` • Page ${index + 1}/${descriptions.length}` : ""}`
                        : "Tout est à jour"
                })
        )
    };
}

function splitDescriptions(entries) {
    const pages = [];
    let page = "";

    for (const entry of entries) {
        const nextPage = page
            ? `${page}\n\n${entry}`
            : entry;

        if (
            page
            && nextPage.length > 3_500
        ) {
            pages.push(page);
            page = entry;
            continue;
        }

        page = nextPage;
    }

    if (page) {
        pages.push(page);
    }

    return pages;
}

function formatPendingInstallation(
    guildId,
    installation
) {
    const heading =
        `**${installation.proxy_name}** — <@${installation.owner_id}>`;

    const story = installation.continuity_name
        ? `📖 ${installation.continuity_name}`
        : "📖 Continuité non précisée";

    const submittedAt =
        formatRelativeDate(
            installation.submitted_at
        );

    const link = buildMessageLink(
        guildId,
        installation
    );

    return [
        heading,
        story,
        `⏳ Envoyée ${submittedAt}`,
        link
            ? `[Ouvrir la demande](${link})`
            : `Installation #${installation.id}`
    ].join("\n");
}

function formatRelativeDate(value) {
    const timestamp = Date.parse(value);

    if (!Number.isFinite(timestamp)) {
        return "à une date inconnue";
    }

    return `<t:${Math.floor(timestamp / 1000)}:R>`;
}

function buildMessageLink(
    guildId,
    installation
) {
    if (
        !installation.validation_channel_id
        || !installation.validation_message_id
    ) {
        return null;
    }

    return [
        "https://discord.com/channels",
        guildId,
        installation.validation_channel_id,
        installation.validation_message_id
    ].join("/");
}

module.exports.buildPendingView =
    buildPendingView;
