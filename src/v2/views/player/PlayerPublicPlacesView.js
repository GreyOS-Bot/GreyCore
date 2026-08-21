const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { CATEGORIES } = require("../staff/StaffPublicPlacesView");

function build(guildId, places) {
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
    return {
        content: "",
        embeds: chunks.slice(0, 10).map((description, index) => new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(index ? "🗺️ Annuaire des lieux · suite" : "🗺️ Annuaire des lieux professionnels et publics")
            .setDescription(description)),
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("v2_library_home").setLabel("Accueil").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("character_close").setLabel("Fermer").setEmoji("❌").setStyle(ButtonStyle.Secondary)
        )]
    };
}

module.exports = { build };
