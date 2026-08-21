const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { CATEGORIES } = require("../staff/StaffPublicPlacesView");

function build(guildId, places, requestedPage = 0) {
    const labels = new Map(CATEGORIES.map(([key, label, emoji]) => [key, `${emoji} ${label}`]));
    const groups = new Map();
    for (const place of places) {
        if (!groups.has(place.category)) groups.set(place.category, []);
        groups.get(place.category).push(place);
    }
    const lines = [];
    for (const [category, entries] of groups) {
        lines.push(`**${labels.get(category) || "📍 Autre"} (${entries.length})**`);
        lines.push(...entries.map(place => `• [${place.name}](https://discord.com/channels/${guildId}/${place.channel_id})`));
    }
    const chunks = [];
    let current = "";
    for (const line of lines) {
        if (`${current}\n${line}`.length > 3900) {
            chunks.push(current);
            current = line;
        } else current = current ? `${current}\n${line}` : line;
    }
    if (current || !chunks.length) chunks.push(current || "Le staff n’a encore publié aucun lieu.");
    const page = Math.max(0, Math.min(Number(requestedPage) || 0, chunks.length - 1));
    const components = [];
    if (chunks.length > 1) components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`v2_player_public_places_page:${page - 1}`).setLabel("Précédent").setEmoji("⬅️").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId(`v2_player_public_places_page:${page + 1}`).setLabel("Suivant").setEmoji("➡️").setStyle(ButtonStyle.Secondary).setDisabled(page === chunks.length - 1)
    ));
    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("v2_library_home").setLabel("Accueil").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("character_close").setLabel("Fermer").setEmoji("❌").setStyle(ButtonStyle.Secondary)
    ));
    return {
        content: "",
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🗺️ Annuaire des lieux professionnels et publics")
            .setDescription(chunks[page])
            .setFooter({ text: `Page ${page + 1}/${chunks.length}` })],
        components
    };
}

module.exports = { build };
