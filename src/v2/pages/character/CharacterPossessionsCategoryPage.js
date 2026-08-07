const { ActionRowBuilder } = require("discord.js");
const UI = require("../../framework");
const dashboardManager = require("../../services/dashboard/CharacterDashboardManager");
const moduleManager = require("../../managers/GuildModuleV2Manager");
const managementPolicy = require("../../core/policies/CharacterManagementPolicy");
const categoryPage = require("./CharacterCategoryPage");

class CharacterPossessionsCategoryPage {
    async execute(interaction, characterId) {
        const data = dashboardManager.getDashboardData(characterId, {
            guildId: interaction.guildId
        });
        if (!data) return interaction.update({ content: "❌ Ce personnage est introuvable.", embeds: [], components: [] });

        const owner = managementPolicy.isOwner(interaction, data.character);
        const buttons = [];
        if (owner && moduleManager.isEnabled(interaction.guildId, "phone")) {
            buttons.push(UI.button.primary({
                id: `v2_phone_open:${characterId}`,
                label: "Téléphone",
                emoji: UI.icons.phone
            }));
        }
        if (moduleManager.isEnabled(interaction.guildId, "outfit")) {
            buttons.push(UI.button.primary({
                id: `page:character:outfit:${characterId}`,
                label: "Outfits",
                emoji: UI.icons.outfit
            }));
        }

        return interaction.update(categoryPage.build({
            character: data.character,
            title: "🎒 Effets personnels",
            description: buttons.length
                ? "Téléphone, outfits et futurs documents personnels."
                : "Aucun effet personnel n’est disponible sur ce serveur.",
            rows: buttons.length ? [new ActionRowBuilder().addComponents(...buttons)] : []
        }));
    }
}

module.exports = new CharacterPossessionsCategoryPage();
