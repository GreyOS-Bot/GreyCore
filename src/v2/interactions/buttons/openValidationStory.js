const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

const v2 =
    require("../../index");

const validationStaffPolicy =
    require(
        "../../core/policies/ValidationStaffPolicy"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

class OpenValidationStory {
    async execute(
        interaction
    ) {
        const parts =
            interaction.customId.split(":");

        const installationId =
            parts[1];

        const requestedPage =
            Number(parts[2] || 0);

        if (!installationId) {
            return replyError(
                interaction,
                "Identifiant d'installation invalide."
            );
        }

        const installation =
            v2.managers.validation
                .getInstallationContext(
                    installationId
                );

        if (!installation) {
            return replyError(
                interaction,
                "Installation introuvable."
            );
        }

        if (
            !validationStaffPolicy.canReview(
                interaction
            )
        ) {
            return replyError(
                interaction,
                "Seul le staff du serveur peut lire cette histoire."
            );
        }

        const guildId =
            interaction.guildId ||
            interaction.guild?.id ||
            null;

        if (
            String(installation.guild_id) !==
            String(guildId || "")
        ) {
            return replyError(
                interaction,
                "Cette installation n'appartient pas à ce serveur."
            );
        }

        const story =
            String(
                installation.story ||
                installation.story_summary ||
                installation.history ||
                installation.biography ||
                ""
            ).trim();

        if (!story) {
            return replyError(
                interaction,
                "Aucune histoire n'a été renseignée."
            );
        }

        const pages =
            this.splitStory(story);

        const pageIndex =
            Math.max(
                0,
                Math.min(
                    requestedPage,
                    pages.length - 1
                )
            );

        const payload = {
            embeds: [
                this.buildEmbed({
                    installation,
                    page:
                        pages[pageIndex],
                    pageIndex,
                    pageCount:
                        pages.length
                })
            ],
            components:
                this.buildComponents({
                    installationId,
                    pageIndex,
                    pageCount:
                        pages.length
                })
        };

        if (
            parts.length > 2 &&
            typeof interaction.update ===
            "function"
        ) {
            return interaction.update(payload);
        }

        return replyPrivate(
            interaction,
            payload
        );
    }

    buildEmbed({
        installation,
        page,
        pageIndex,
        pageCount
    }) {
        const displayName =
            String(
                installation.proxy_name ||
                "Personnage"
            ).trim();

        const embed =
            new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(
                    `\u{1F4D6} Histoire de ${displayName}`
                )
                .setDescription(page);

        const avatarUrl =
            installation.local_avatar_url ||
            installation.global_avatar_url ||
            installation.avatar_url ||
            null;

        if (avatarUrl) {
            embed.setThumbnail(avatarUrl);
        }

        if (pageCount > 1) {
            embed.setFooter({
                text:
                    `Page ${pageIndex + 1} sur ${pageCount}`
            });
        }

        return embed;
    }

    buildComponents({
        installationId,
        pageIndex,
        pageCount
    }) {
        if (pageCount <= 1) {
            return [];
        }

        return [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_validation_story:${installationId}:${pageIndex - 1}`
                        )
                        .setLabel("Précédent")
                        .setEmoji("⬅️")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(pageIndex === 0),
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_validation_story:${installationId}:${pageIndex + 1}`
                        )
                        .setLabel("Suivant")
                        .setEmoji("➡️")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(
                            pageIndex ===
                            pageCount - 1
                        )
                )
        ];
    }

    splitStory(
        story,
        maximumLength = 3800
    ) {
        const paragraphs =
            story
                .split(/\n\s*\n/)
                .map(
                    paragraph =>
                        paragraph.trim()
                )
                .filter(Boolean);

        const pages = [];
        let currentPage = "";

        for (const paragraph of paragraphs) {
            const pieces =
                this.splitLongParagraph(
                    paragraph,
                    maximumLength
                );

            for (const piece of pieces) {
                const candidate =
                    currentPage
                        ? `${currentPage}\n\n${piece}`
                        : piece;

                if (
                    candidate.length >
                    maximumLength
                ) {
                    pages.push(currentPage);
                    currentPage = piece;
                } else {
                    currentPage = candidate;
                }
            }
        }

        if (currentPage) {
            pages.push(currentPage);
        }

        return pages.length
            ? pages
            : [story.slice(0, maximumLength)];
    }

    splitLongParagraph(
        paragraph,
        maximumLength
    ) {
        const pieces = [];
        let remaining =
            paragraph.trim();

        while (
            remaining.length >
            maximumLength
        ) {
            const preview =
                remaining.slice(
                    0,
                    maximumLength
                );

            const lastSpace =
                preview.lastIndexOf(" ");

            const cutIndex =
                lastSpace > 0
                    ? lastSpace
                    : maximumLength;

            pieces.push(
                remaining.slice(0, cutIndex).trim()
            );

            remaining =
                remaining.slice(cutIndex).trim();
        }

        if (remaining) {
            pieces.push(remaining);
        }

        return pieces;
    }
}

module.exports =
    new OpenValidationStory();
