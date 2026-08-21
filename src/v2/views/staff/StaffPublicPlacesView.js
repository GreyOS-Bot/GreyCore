const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");

const CATEGORIES = Object.freeze([
    ["restaurant", "Restaurant", "🍽️"], ["bar_club", "Bar / club", "🍸"],
    ["boutique", "Boutique", "🛍️"], ["garage", "Garage", "🔧"],
    ["service", "Service", "🧰"], ["sante", "Santé", "🏥"],
    ["administration", "Administration", "🏛️"], ["loisir", "Loisir", "🎭"],
    ["hebergement", "Hébergement", "🏨"], ["autre", "Autre", "📍"]
]);

function build(interaction, forum, places, focusChannelId = null, requestedPage = 0) {
    const grouped = new Map();
    for (const place of places) {
        const key = place.category || "non_classe";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(place);
    }
    const categoryLabel = key => CATEGORIES.find(([value]) => value === key)?.[1] || "Non classés";
    const lines = [];
    for (const [category, entries] of grouped) {
        lines.push(`**${categoryLabel(category)} (${entries.length})**`);
        lines.push(...entries.map(place => `• [${place.name}](https://discord.com/channels/${interaction.guildId}/${place.channel_id})`));
    }
    const chunks = [];
    let chunk = "";
    for (const line of lines) {
        if (`${chunk}\n${line}`.length > 3900) {
            chunks.push(chunk);
            chunk = line;
        } else chunk = chunk ? `${chunk}\n${line}` : line;
    }
    if (chunk || !chunks.length) chunks.push(chunk || "Aucun lieu trouvé.");
    const page = Math.max(0, Math.min(Number(requestedPage) || 0, chunks.length - 1));
    const focus = places.find(place => String(place.channel_id) === String(focusChannelId))
        || places.find(place => !place.category);
    const components = [];
    if (focus) components.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`v2_staff_public_place_category:${forum.id}:${focus.channel_id}`)
            .setPlaceholder(`Classer : ${focus.name}`)
            .addOptions(CATEGORIES.map(([value, label, emoji]) => ({ value, label, emoji })))
    ));
    if (chunks.length > 1) components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`v2_staff_public_places_page:${forum.id}:${page - 1}`)
            .setLabel("Précédent").setEmoji("⬅️").setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`v2_staff_public_places_page:${forum.id}:${page + 1}`)
            .setLabel("Suivant").setEmoji("➡️").setStyle(ButtonStyle.Secondary)
            .setDisabled(page === chunks.length - 1)
    ));
    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`v2_staff_public_places_refresh:${forum.id}`).setLabel("Actualiser le forum").setEmoji("🔄").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("v2_staff_scenes_public_places").setLabel("Changer de forum").setEmoji("🗺️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("page:staff:scenes:root").setLabel("Retour").setEmoji("⬅️").setStyle(ButtonStyle.Secondary)
    ));
    return {
        content: "",
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🗺️ Lieux professionnels/publics · ${forum.name}`)
            .setDescription(chunks[page])
            .setFooter({ text: [
                `Page ${page + 1}/${chunks.length}`,
                focus ? `Saisie rapide : « ${focus.name} »` : "Tous les lieux sont classés."
            ].join(" · ") })],
        components
    };
}

module.exports = { build, CATEGORIES };
