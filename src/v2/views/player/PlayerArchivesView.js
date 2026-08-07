const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

function build(characters) {
    const visible = characters.slice(0, 25);
    const components = [];
    if (visible.length) {
        components.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("v2_player_archives_select")
                .setPlaceholder("Choisir un personnage à restaurer")
                .addOptions(visible.map(character => ({
                    label: String(character.display_name || character.proxy_name).slice(0, 100),
                    value: String(character.id),
                    description: `${character.continuity_count} continuité(s) · ${character.installation_count} installation(s)`.slice(0, 100),
                    emoji: "📦"
                })))
        ));
    }

    components.push(navigation());
    return {
        embeds: [new EmbedBuilder()
            .setColor(0x747F8D)
            .setTitle("📦 Mes personnages archivés")
            .setDescription(visible.length
                ? [
                    `Tu possèdes **${characters.length} personnage(s) archivé(s)**.`,
                    "Ils ne sont plus jouables et n’apparaissent plus dans l’annuaire public.",
                    "Choisis-en un pour le restaurer avec toutes ses continuités et informations.",
                    "",
                    ...visible.map(character => `• **${character.display_name || character.proxy_name}**`)
                ].join("\n")
                : "Aucun personnage archivé. Un personnage archivé pourra être restauré ici sans perdre ses informations.")
            .setFooter({ text: "GreyCore · Archives personnelles" })],
        components
    };
}

function buildRestoreConfirmation(character) {
    const name = character.display_name || character.proxy_name || "Personnage";
    return {
        embeds: [new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle("📦 Restaurer ce personnage ?")
            .setDescription([
                `Tu vas restaurer **${name}**.`,
                "Le personnage réapparaîtra dans ta bibliothèque et pourra de nouveau être utilisé selon l’état de ses installations."
            ].join("\n\n"))],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`v2_player_archive_restore:${character.id}`)
                    .setLabel("Restaurer")
                    .setEmoji("♻️")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("v2_player_archives")
                    .setLabel("Annuler")
                    .setStyle(ButtonStyle.Secondary)
            ),
            navigation()
        ]
    };
}

function navigation() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("v2_library_home").setLabel("Accueil").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("character_close").setLabel("Fermer").setEmoji("❌").setStyle(ButtonStyle.Secondary)
    );
}

module.exports = { build, buildRestoreConfirmation };
