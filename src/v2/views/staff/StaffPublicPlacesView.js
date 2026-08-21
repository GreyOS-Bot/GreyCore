const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");

const CATEGORIES = Object.freeze([
    ["restaurant", "Restaurant", "🍽️"], ["bar_club", "Bar / club", "🍸"],
    ["boutique", "Boutique", "🛍️"], ["garage", "Garage", "🔧"],
    ["service", "Service", "🧰"], ["sante", "Santé", "🏥"],
    ["administration", "Administration", "🏛️"], ["loisir", "Loisir", "🎭"],
    ["hebergement", "Hébergement", "🏨"], ["autre", "Autre", "📍"]
]);

function build(interaction, forum, places, focusChannelId = null, requestedPage = 0) {
    const pageCount = Math.max(1, Math.ceil(places.length / 25));
    const page = Math.max(0, Math.min(Number(requestedPage) || 0, pageCount - 1));
    const pagePlaces = places.slice(page * 25, (page + 1) * 25);
    const grouped = new Map();
    for (const place of pagePlaces) {
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
    const focus = places.find(place => String(place.channel_id) === String(focusChannelId))
        || places.find(place => !place.category);
    const components = [];
    const selectablePlaces = pagePlaces;
    if (selectablePlaces.length) components.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`v2_staff_public_place_pick:${forum.id}:${page}`)
            .setPlaceholder("Modifier la catégorie d’un lieu")
            .addOptions(selectablePlaces.map(place => ({
                value: String(place.channel_id),
                label: String(place.name).slice(0, 100),
                description: `Catégorie actuelle : ${categoryLabel(place.category)}`.slice(0, 100),
                emoji: "📍"
            })))
    ));
    if (focus) components.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`v2_staff_public_place_category:${forum.id}:${focus.channel_id}:${page}`)
            .setPlaceholder(`${focus.category ? "Modifier" : "Classer"} : ${focus.name}`.slice(0, 150))
            .addOptions(CATEGORIES.map(([value, label, emoji]) => ({ value, label, emoji })))
    ));
    if (pageCount > 1) components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`v2_staff_public_places_page:${forum.id}:${page - 1}`)
            .setLabel("Précédent").setEmoji("⬅️").setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`v2_staff_public_places_page:${forum.id}:${page + 1}`)
            .setLabel("Suivant").setEmoji("➡️").setStyle(ButtonStyle.Secondary)
            .setDisabled(page === pageCount - 1)
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
            .setDescription(lines.join("\n") || "Aucun lieu trouvé.")
            .setFooter({ text: [
                `Page ${page + 1}/${pageCount}`,
                focus ? `Saisie rapide : « ${focus.name} »` : "Tous les lieux sont classés."
            ].join(" · ") })],
        components
    };
}

module.exports = { build, CATEGORIES };
