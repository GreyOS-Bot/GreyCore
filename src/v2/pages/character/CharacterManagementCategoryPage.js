const { ActionRowBuilder } = require("discord.js");
const UI = require("../../framework");
const dashboardManager = require("../../services/dashboard/CharacterDashboardManager");
const managementPolicy = require("../../core/policies/CharacterManagementPolicy");
const categoryPage = require("./CharacterCategoryPage");

class CharacterManagementCategoryPage {
    async execute(interaction, characterId) {
        const data = dashboardManager.getDashboardData(characterId, {
            guildId: interaction.guildId
        });
        if (!data) return interaction.update({ content: "❌ Ce personnage est introuvable.", embeds: [], components: [] });
        if (!managementPolicy.isOwner(interaction, data.character)) {
            return interaction.update({ content: "❌ Seul le propriétaire peut gérer ce personnage.", embeds: [], components: [] });
        }

        const installationCount = Number(data.counts.installations || 0);
        const buttons = [
            UI.button.success({
                id: `v2_character_deploy:${characterId}`,
                label: "Installer sur ce serveur",
                emoji: "🖥️"
            }),
            UI.button.primary({
                id: `page:character:installations:${characterId}`,
                label: installationCount
                    ? `Installations (${installationCount})`
                    : "Installations",
                emoji: UI.icons.install
            })
        ];

        return interaction.update(categoryPage.build({
            character: data.character,
            title: "🌍 Univers",
            description: [
                "Installez ce personnage dans d’autres univers et gérez ses continuités.",
                "Depuis le serveur de destination, choisissez **Installer sur ce serveur**, puis envoyez la demande au staff."
            ].join("\n\n"),
            rows: [new ActionRowBuilder().addComponents(...buttons)]
        }));
    }
}

module.exports = new CharacterManagementCategoryPage();
