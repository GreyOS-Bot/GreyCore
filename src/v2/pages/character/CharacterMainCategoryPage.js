const {
    ActionRowBuilder
} = require("discord.js");

const UI = require("../../framework");

const characterDashboardManager =
    require("../../services/dashboard/CharacterDashboardManager");

const guildModuleManager =
    require("../../managers/GuildModuleV2Manager");

const characterCategoryPage =
    require("./CharacterCategoryPage");

class CharacterMainCategoryPage {

    async execute(interaction, characterId) {
        const dashboardData =
            characterDashboardManager.getDashboardData(
                characterId,
                {
                    guildId: interaction.guildId
                }
            );

        if (!dashboardData) {
            return interaction.update({
                content: "❌ Ce personnage est introuvable.",
                embeds: [],
                components: []
            });
        }

        const countLabel = (label, count) =>
            Number(count || 0) > 0
                ? `${label} (${count})`
                : label;

        const isEnabled = moduleKey =>
            guildModuleManager.isEnabled(
                interaction.guildId,
                moduleKey
            );

        const buttons = [
            UI.button.primary({
                id: `page:character:profile:${characterId}`,
                label: "Fiche",
                emoji: UI.icons.profile
            })
        ];

        if (isEnabled("states")) {
            buttons.push(
                UI.button.primary({
                    id: `page:character:states:${characterId}`,
                    label: countLabel(
                        "États",
                        dashboardData.counts.states
                    ),
                    emoji: UI.icons.states
                })
            );
        }

        if (isEnabled("journal")) {
            buttons.push(
                UI.button.primary({
                    id: `page:character:journal:${characterId}`,
                    label: countLabel(
                        "Journal",
                        dashboardData.counts.journal
                    ),
                    emoji: UI.icons.journal
                })
            );
        }

        if (isEnabled("outfit")) {
            buttons.push(
                UI.button.primary({
                    id: `page:character:outfit:${characterId}`,
                    label: "Outfit",
                    emoji: UI.icons.outfit
                })
            );
        }

        return interaction.update(
            characterCategoryPage.build({
                character: dashboardData.character,
                title: "📄 Personnage RP",
                description: "Consultez les informations du personnage.",
                rows: [
                    new ActionRowBuilder().addComponents(
                        ...buttons
                    )
                ]
            })
        );
    }
}

module.exports =
    new CharacterMainCategoryPage();
