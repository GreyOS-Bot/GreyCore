const { ActionRowBuilder } = require("discord.js");
const UI = require("../../framework");
const dashboardManager = require("../../services/dashboard/CharacterDashboardManager");
const managementPolicy = require("../../core/policies/CharacterManagementPolicy");
const categoryPage = require("./CharacterCategoryPage");

class CharacterMainCategoryPage {
    async execute(interaction, characterId) {
        const data = dashboardManager.getDashboardData(characterId, {
            guildId: interaction.guildId
        });
        if (!data) return notFound(interaction);

        const buttons = [UI.button.primary({
            id: `page:character:profile:${characterId}`,
            label: "Fiche",
            emoji: UI.icons.profile
        })];

        if (managementPolicy.isOwner(interaction, data.character)) {
            buttons.push(
                UI.button.primary({
                    id: `v2_aliases_open:${characterId}`,
                    label: "Alias",
                    emoji: "🏷️"
                }),
                UI.button.secondary({
                    id: `page:character:settings:${characterId}`,
                    label: "Paramètres",
                    emoji: UI.icons.settings
                })
            );
        }

        return interaction.update(categoryPage.build({
            character: data.character,
            title: "👤 Personnage",
            description: "Identité, fiche publique, alias et paramètres du personnage.",
            rows: [new ActionRowBuilder().addComponents(...buttons)]
        }));
    }
}

function notFound(interaction) {
    return interaction.update({
        content: "❌ Ce personnage est introuvable.",
        embeds: [],
        components: []
    });
}

module.exports = new CharacterMainCategoryPage();
