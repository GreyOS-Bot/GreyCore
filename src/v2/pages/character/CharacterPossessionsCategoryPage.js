const { ActionRowBuilder } = require("discord.js");

const UI = require("../../framework");

const characterDashboardManager =
    require("../../services/dashboard/CharacterDashboardManager");

const characterCategoryPage =
    require("./CharacterCategoryPage");

const guildModuleManager =
    require("../../managers/GuildModuleV2Manager");

class CharacterPossessionsCategoryPage {

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

        if (
            !guildModuleManager.isEnabled(
                interaction.guildId,
                "assets"
            )
        ) {
            return interaction.update({
                content: "ℹ️ Le module Biens est désactivé sur ce serveur.",
                embeds: [],
                components: []
            });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                UI.button.primary({
                    id: `page:character:assets:${characterId}`,
                    label: "Gérer les biens",
                    emoji: UI.icons.inventory
                })
            );

        return interaction.update(
            characterCategoryPage.build({
                character: dashboardData.character,
                title: "🎒 Biens",
                description: "Véhicules, propriétés, entreprises, animaux et tous les autres biens de votre personnage.",
                rows: [row]
            })
        );
    }
}

module.exports =
    new CharacterPossessionsCategoryPage();
