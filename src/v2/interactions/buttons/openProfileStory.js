const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

class OpenProfileStory {

    async execute(
        interaction
    ) {

        const parts =
            interaction.customId.split(":");

        const characterId =
            parts[1];

        const requestedPage =
            Number(parts[2] || 0);

        const dashboardData =
            characterDashboardManager.getDashboardData(
                characterId,
                {
                    guildId:
                        interaction.guildId
                }
            );

        if (!dashboardData) {

            return interaction.update({

                content:
                    "❌ Ce personnage est introuvable.",

                embeds: [],

                components: []

            });

        }

        const {
            character,
            profile
        } = dashboardData;

        const story =
            profile?.story
                ? String(profile.story).trim()
                : "";

        if (!story) {

            return interaction.update({

                content:
                    "📜 Aucune histoire n’a été renseignée.",

                embeds: [],

                components: [
                    this.buildNavigationRow(
                        characterId,
                        characterManagementPolicy
                            .isOwner(
                                interaction,
                                dashboardData.character
                            )
                    )
                ]

            });

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

        const characterHeader =
            UI.components.characterHeader;

        const displayName =
            characterHeader
                .getDisplayName(character)
                .toUpperCase();

        const embed =
            UI.embed.create({

                title:
                    `📜 Histoire de ${displayName}`,

                thumbnail:
                    character.avatar_url ||
                    null,

                description:
                    pages[pageIndex]

            });

        if (pages.length > 1) {

            embed.setFooter({

                text:
                    `Page ${pageIndex + 1} sur ${pages.length}`

            });

        }

        const components = [];

        if (pages.length > 1) {

            components.push(
                this.buildPaginationRow(
                    characterId,
                    pageIndex,
                    pages.length
                )
            );

        }

        components.push(
            this.buildNavigationRow(
                characterId,
                characterManagementPolicy
                    .isOwner(
                        interaction,
                        character
                    )
            )
        );

        return interaction.update(

            UI.page.create({

                embed,

                components

            })

        );

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

        for (
            const paragraph
            of paragraphs
        ) {

            if (
                paragraph.length >
                maximumLength
            ) {

                if (currentPage) {

                    pages.push(
                        currentPage.trim()
                    );

                    currentPage = "";

                }

                const pieces =
                    this.splitLongParagraph(
                        paragraph,
                        maximumLength
                    );

                pages.push(
                    ...pieces
                );

                continue;

            }

            const candidate =
                currentPage
                    ? `${currentPage}\n\n${paragraph}`
                    : paragraph;

            if (
                candidate.length >
                maximumLength
            ) {

                pages.push(
                    currentPage.trim()
                );

                currentPage =
                    paragraph;

            } else {

                currentPage =
                    candidate;

            }

        }

        if (currentPage) {

            pages.push(
                currentPage.trim()
            );

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
                remaining
                    .slice(
                        0,
                        cutIndex
                    )
                    .trim()
            );

            remaining =
                remaining
                    .slice(cutIndex)
                    .trim();

        }

        if (remaining) {
            pieces.push(remaining);
        }

        return pieces;

    }

    buildPaginationRow(
        characterId,
        pageIndex,
        pageCount
    ) {

        return new ActionRowBuilder()
            .addComponents(

                UI.button.secondary({

                    id:
                        `v2_profile_story_view:${characterId}:${pageIndex - 1}`,

                    label:
                        "Précédent",

                    emoji:
                        "⬅️",

                    disabled:
                        pageIndex === 0

                }),

                UI.button.secondary({

                    id:
                        `v2_profile_story_view:${characterId}:${pageIndex + 1}`,

                    label:
                        "Suivant",

                    emoji:
                        "➡️",

                    disabled:
                        pageIndex ===
                        pageCount - 1

                })

            );

    }

    buildNavigationRow(
    characterId,
    isOwner = false
) {

    const buttons = [];

    if (isOwner) {
        buttons.push(

            UI.button.primary({

                id:
                    `v2_profile_story_edit:${characterId}`,

                label:
                    "Modifier l’histoire",

                emoji:
                    "✏️"

            })
        );
    }

    buttons.push(

            UI.button.secondary({

                id:
                    `page:character:profile:${characterId}`,

                label:
                    "Profil",

                emoji:
                    "⬅️"

            }),

            UI.components
                .navigation
                .close()

    );

    return new ActionRowBuilder()
        .addComponents(
            ...buttons
        );

}

}

module.exports =
    new OpenProfileStory();
