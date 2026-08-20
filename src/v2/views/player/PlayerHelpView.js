const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const TOPICS = [
    ["player_character", "Personnage", "Créer, valider, compléter", "👤"],
    ["player_relations", "Relations", "Relations et généalogie", "❤️"],
    ["player_states", "États", "États RP, statistiques et effets", "🩹"],
    ["player_phone", "Téléphone", "SMS, MMS, appels, e-mails", "📱"],
    ["player_bank", "Biens", "Inventaire, patrimoine et effets", "🎒"],
    ["player_scenes", "Scènes", "Cycles, rattrapage, continuité", "🎬"],
    ["docs_privacy", "Confidentialité", "Données et droit à l’oubli", "🔐"]
];

function build() {
    return {
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("❓ Aide GreyCore")
            .setDescription([
                "⚡ Choisis une rubrique pour voir l’aide détaillée.",
                "Navigation pensée comme une vraie application : peu de commandes, beaucoup d’actions depuis les boutons.",
                "",
                "**Pour commencer :** ouvre **Mes personnages**, sélectionne ton personnage, puis navigue dans ses pages."
            ].join("\n"))],
        components: [new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("v2_player_help_topic")
                .setPlaceholder("Choisir une rubrique")
                .addOptions(TOPICS.map(([value, label, description, emoji]) => ({ value, label, description, emoji })))
        ), navigationRow()]
    };
}

function navigationRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("v2_library_home").setLabel("Accueil").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("character_close").setLabel("Fermer").setEmoji("❌").setStyle(ButtonStyle.Secondary)
    );
}

module.exports = { build, navigationRow };
