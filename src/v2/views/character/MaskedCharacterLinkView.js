const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function build(candidates, { mode = "create", maskedCharacterId = null, staff = false } = {}) {
    const available = candidates.filter(character =>
        character.character_type === "personnage_joue"
        && !character.is_archived
    );
    const customId = mode === "create"
        ? "v2_masked_parent_create_select"
        : `v2_masked_parent_link_select:${maskedCharacterId}:${staff ? "staff" : "owner"}`;
    return {
        content: "",
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🥷 Relier la version masquée")
            .setDescription(available.length
                ? "Choisis le **PJ principal** auquel cette identité masquée appartient. Le PJ principal restera le seul compté dans les statistiques."
                : "Aucun PJ principal disponible. Crée et fais d’abord valider un PJ classique.")],
        components: [
            ...(available.length ? [new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder("Choisir le PJ principal")
                    .addOptions(available.slice(0, 25).map(character => ({
                        label: String(character.base_firstname || character.proxy_name).slice(0, 100),
                        description: `Proxy : ${character.proxy_name}`.slice(0, 100),
                        value: String(character.id),
                        emoji: "👤"
                    })))
            )] : []),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(mode === "create" ? "v2_character_create" : `page:character:settings:${maskedCharacterId}`)
                    .setLabel("Retour")
                    .setEmoji("⬅️")
                    .setStyle(ButtonStyle.Secondary)
            )
        ]
    };
}

module.exports = { build };
