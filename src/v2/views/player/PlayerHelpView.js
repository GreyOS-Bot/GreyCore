const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const TOPICS = [
    ["personnages", "Personnages", "Création, validation et installations", "👤"],
    ["relations", "Relations", "Liens et arbre familial", "❤️"],
    ["etats", "États", "États RP du personnage", "🩹"],
    ["telephone", "Téléphone", "SMS, MMS, appels et groupes", "📱"],
    ["biens", "Biens", "Inventaire, propriétés et véhicules", "🎒"],
    ["scenes", "Scènes", "Cycles et rattrapages", "🎬"],
    ["confidentialite", "Confidentialité", "Données personnelles et oubli", "🔐"]
];

function build() {
    return {
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("❓ Aide GreyCore")
            .setDescription([
                "Choisis ce que tu souhaites comprendre.",
                "Tu peux revenir à ton espace personnel sans utiliser une nouvelle commande.",
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
