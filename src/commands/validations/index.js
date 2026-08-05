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
    deferPrivate,
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
        )
        .addSubcommand(sub =>
            sub
                .setName("annuler")
                .setDescription(
                    "Annule une installation non aboutie."
                )
                .addStringOption(option =>
                    option
                        .setName("personnage")
                        .setDescription(
                            "Personnage et installation à annuler"
                        )
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option
                        .setName("raison")
                        .setDescription(
                            "Motif conservé dans l’historique"
                        )
                        .setRequired(true)
                        .setMaxLength(500)
                )
        ),

    async autocomplete(interaction) {
        const focused =
            interaction.options.getFocused(true);

        if (focused.name !== "personnage") {
            return interaction.respond([]);
        }

        const installations =
            validationManager
                .searchIncompleteForGuild(
                    interaction.guildId,
                    focused.value
                );

        return interaction.respond(
            installations.map(installation => ({
                name: formatIncompleteChoice(
                    interaction,
                    installation
                ).slice(0, 100),
                value: String(installation.id)
            }))
        );
    },

    async execute(interaction) {
        if (
            !await requireStaffCommandAccess(
                interaction
            )
        ) {
            return;
        }

        const subcommand =
            interaction.options?.getSubcommand?.()
            || "attente";

        if (subcommand === "annuler") {
            await deferPrivate(interaction);

            const installationId =
                interaction.options.getString(
                    "personnage",
                    true
                );
            const reason =
                interaction.options.getString(
                    "raison",
                    true
                );

            const previousInstallation =
                validationManager.getInstallation(
                    installationId
                );

            const result =
                validationManager
                    .cancelIncompleteInstallation({
                        installationId,
                        guildId: interaction.guildId,
                        cancelledBy:
                            interaction.user.id,
                        reason
                    });

            await removeValidationMessage(
                interaction,
                previousInstallation
            );

            return replyPrivate(
                interaction,
                `✅ L’installation de **${result.context.proxy_name}** a été annulée. Le personnage n’a pas été supprimé.`
            );
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

function formatIncompleteChoice(
    interaction,
    installation
) {
    const owner =
        interaction.guild?.members?.cache
            ?.get(installation.owner_id)
            ?.displayName
        || installation.owner_id;
    const name =
        installation.firstname
        || installation.proxy_name;
    const familyName =
        installation.lastname
            ? ` ${installation.lastname}`
            : "";

    return `${name}${familyName} — ${owner} — ${installation.status}`;
}

async function removeValidationMessage(
    interaction,
    installation
) {
    if (
        !installation?.validation_channel_id
        || !installation.validation_message_id
    ) {
        return;
    }

    try {
        const channel =
            await interaction.client.channels.fetch(
                installation.validation_channel_id
            );
        const message =
            await channel?.messages?.fetch(
                installation.validation_message_id
            );

        await message?.delete();
    } catch {
        // L’installation reste annulée même si Discord a déjà supprimé la carte.
    }
}

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
