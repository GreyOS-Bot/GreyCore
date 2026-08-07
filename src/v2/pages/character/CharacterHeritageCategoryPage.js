const { ActionRowBuilder } = require("discord.js");
const UI = require("../../framework");
const dashboardManager = require("../../services/dashboard/CharacterDashboardManager");
const moduleManager = require("../../managers/GuildModuleV2Manager");
const categoryPage = require("./CharacterCategoryPage");

class CharacterHeritageCategoryPage {
    async execute(interaction, characterId) {
        const data = dashboardManager.getDashboardData(characterId, {
            guildId: interaction.guildId
        });
        if (!data) return interaction.update({ content: "❌ Ce personnage est introuvable.", embeds: [], components: [] });

        const buttons = [];
        if (moduleManager.isEnabled(interaction.guildId, "assets")) {
            buttons.push(UI.button.primary({
                id: `page:character:assets:${characterId}`,
                label: "Biens",
                emoji: UI.icons.inventory
            }));
        }

        return interaction.update(categoryPage.build({
            character: data.character,
            title: "🏠 Patrimoine",
            description: "Biens, véhicules, propriétés et entreprises du personnage.",
            rows: buttons.length ? [new ActionRowBuilder().addComponents(...buttons)] : []
        }));
    }
}

module.exports = new CharacterHeritageCategoryPage();
