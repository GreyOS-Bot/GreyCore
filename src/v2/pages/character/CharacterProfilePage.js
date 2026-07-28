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

class CharacterProfilePage {

    async execute(
        interaction,
        characterId
    ) {

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

        const isOwner =
            characterManagementPolicy
                .isOwner(
                    interaction,
                    character
                );

        const characterHeader =
            UI.components.characterHeader;

        const displayName =
            characterHeader
                .getDisplayName(character)
                .toUpperCase();

        const age =
            characterHeader
                .getAge({
                    ...character,
                    age:
                        profile?.age ??
                        character.age
                });

        const organization =
            characterHeader
                .getOrganization({
                    ...character,
                    organization:
                        profile?.gang ??
                        character.organization
                });

        const characterType =
            characterHeader
                .getCharacterType(character);

        const rpStatus =
            characterHeader
                .getRpStatus(character);

        const summaryParts = [];

        if (characterType) {
            summaryParts.push(
                `🎭 ${characterType}`
            );
        }

        if (organization) {
            summaryParts.push(
                `💼 ${organization}`
            );
        }

        if (age) {
            summaryParts.push(
                `🎂 ${age}`
            );
        }

        const descriptionLines = [];

        if (summaryParts.length) {
            descriptionLines.push(
                summaryParts.join(" • ")
            );
        }

        if (rpStatus) {

            descriptionLines.push(
                "",
                `❤️‍🩹 ${rpStatus}`
            );

        }

        if (isOwner) {
            descriptionLines.push(
                "",
                "🟡 Les modifications de fiche sont envoyées au staff et les informations actuelles restent visibles jusqu’à validation."
            );
        }

        const identity = [];
        const information = [];

        const add = (
            array,
            label,
            value
        ) => {

            if (
                value === null ||
                value === undefined
            ) {
                return;
            }

            const text =
                String(value).trim();

            if (!text) {
                return;
            }

            array.push(
                `• **${label}** · ${text}`
            );

        };

        add(
            identity,
            "Prénom",
            profile?.firstname
        );

        add(
            identity,
            "Nom",
            profile?.lastname
        );

        add(
            identity,
            "Âge",
            profile?.age
        );

        add(
            identity,
            "Date de naissance",
            profile?.birthday
        );

        add(
            identity,
            "Genre",
            profile?.gender
        );

        add(
            information,
            "Origine",
            profile?.origin
        );

        add(
            information,
            "Métier",
            profile?.occupation
        );

        add(
            information,
            "Organisation",
            profile?.gang
        );

        add(
            information,
            "Taille",
            profile?.height
        );

        add(
            information,
            "Poids",
            profile?.weight
        );

        add(
            information,
            "Faceclaim",
            profile?.faceclaim
        );

        const fields = [];

        if (identity.length) {

            fields.push({

                name:
                    "🪪 Identité",

                value:
                    identity.join("\n"),

                inline:
                    false

            });

        }

        if (information.length) {

            fields.push({

                name:
                    "💼 Informations",

                value:
                    information.join("\n"),

                inline:
                    false

            });

        }

        const fullStory =
            profile?.story
                ? String(profile.story).trim()
                : String(
                    character.story ||
                    ""
                ).trim();

        const storyPreview =
            this.getStoryPreview(fullStory);

        if (storyPreview) {

            fields.push({

                name:
                    "📜 Histoire",

                value:
                    storyPreview,

                inline:
                    false

            });

        }

        if (!fields.length) {

            fields.push({

                name:
                    "🪪 Profil",

                value:
                    "Aucune information n’a encore été ajoutée.",

                inline:
                    false

            });

        }

        const embed =
            UI.embed.create({

                title:
                    displayName,

                thumbnail:
                    character.avatar_url ||
                    null,

                description:
                    descriptionLines.length
                        ? descriptionLines.join("\n")
                        : null

            });

        embed.addFields(fields);

        const actionButtons = [];

        if (isOwner) {
            actionButtons.push(
                UI.button.primary({

                id:
                    `v2_profile_identity_edit:${characterId}`,

                label:
                    "Identité",

                emoji:
                    "✏️"

                }),

                UI.button.primary({

                id:
                    `v2_profile_information_edit:${characterId}`,

                label:
                    "Informations",

                emoji:
                    "📝"

                }),

                UI.button.primary({

    id:
        `v2_profile_story_edit:${characterId}`,

    label:
        "Histoire",

    emoji:
        "📜"

                })

            );
        }

        if (fullStory) {
            actionButtons.push(
                UI.button.secondary({

                    id:
                        `v2_profile_story_view:${characterId}:0`,

                    label:
                        "Lire l'histoire",

                    emoji:
                        "📖"

                })
            );
        }

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.secondary({

                        id:
                            `page:character:category:character:${characterId}`,

                        label:
                            "Personnage",

                        emoji:
                            "⬅️"

                    }),

                    UI.components
                        .navigation
                        .close()

                );

        return interaction.update(

            UI.page.create({

                embed,

                components: [
                    ...(actionButtons.length
                        ? [
                            new ActionRowBuilder()
                                .addComponents(
                                    ...actionButtons
                                )
                        ]
                        : []),
                    navigationRow
                ]

            })

        );

    }

    getStoryPreview(
        story
    ) {

        if (!story) {
            return "";
        }

        if (
            story.length <=
            this.storyPreviewLength
        ) {
            return story;
        }

        const preview =
            story.slice(
                0,
                this.storyPreviewLength
            );

        const lastSpace =
            preview.lastIndexOf(" ");

        const cleanPreview =
            lastSpace > 0
                ? preview.slice(
                    0,
                    lastSpace
                )
                : preview;

        return `${cleanPreview.trim()}…`;

    }

    get storyPreviewLength() {
        return 700;
    }

}

module.exports =
    new CharacterProfilePage();
