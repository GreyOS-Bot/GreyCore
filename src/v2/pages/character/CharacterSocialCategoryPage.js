const { ActionRowBuilder } = require("discord.js");
const UI = require("../../framework");
const dashboardManager = require("../../services/dashboard/CharacterDashboardManager");
const moduleManager = require("../../managers/GuildModuleV2Manager");
const categoryPage = require("./CharacterCategoryPage");

class CharacterSocialCategoryPage {
    async execute(interaction, characterId) {
        const data = dashboardManager.getDashboardData(characterId, {
            guildId: interaction.guildId
        });
        if (!data) return notFound(interaction);

        const count = (label, value) => Number(value || 0) > 0
            ? `${label} (${value})`
            : label;
        const enabled = key => moduleManager.isEnabled(interaction.guildId, key);
        const buttons = [];

        if (enabled("relationships")) buttons.push(UI.button.primary({
            id: `page:character:relationships:${characterId}`,
            label: count("Relations", data.counts.relations),
            emoji: UI.icons.relations
        }));
        if (enabled("encounters")) buttons.push(UI.button.primary({
            id: `page:character:encounters:${characterId}`,
            label: count("Rencontres", data.counts.encounters),
            emoji: UI.icons.encounters
        }));
        if (enabled("journal")) buttons.push(UI.button.primary({
            id: `page:character:journal:${characterId}`,
            label: count("Journal", data.counts.journal),
            emoji: UI.icons.journal
        }));
        if (enabled("states")) buttons.push(UI.button.primary({
            id: `page:character:states:${characterId}`,
            label: count("États", data.counts.states),
            emoji: UI.icons.states
        }));

        return interaction.update(categoryPage.build({
            character: data.character,
            title: "📖 Vie du personnage",
            description: buttons.length
                ? "Relations, rencontres, journal et situation actuelle."
                : "Aucun module de vie du personnage n’est activé sur ce serveur.",
            rows: buttons.length
                ? [new ActionRowBuilder().addComponents(...buttons)]
                : []
        }));
    }
}

function notFound(interaction) {
    return interaction.update({ content: "❌ Ce personnage est introuvable.", embeds: [], components: [] });
}

module.exports = new CharacterSocialCategoryPage();
