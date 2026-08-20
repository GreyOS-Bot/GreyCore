const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const characterTypes = require("../../core/character/CharacterTypeCatalog");

const PAGE_SIZE = 20;

function displayName(character) {
    return String(character.firstname || character.proxy_name || "Personnage sans nom").trim();
}

function ownerLabel(ownerId) {
    return ownerId ? `<@${ownerId}>` : "Utilisateur introuvable";
}

function build(roster, requestedPage = 0) {
    const characters = [...roster].sort((left, right) =>
        displayName(left).localeCompare(displayName(right), "fr", { sensitivity: "base" })
    );
    const pageCount = Math.max(1, Math.ceil(characters.length / PAGE_SIZE));
    const page = Math.min(Math.max(Number(requestedPage) || 0, 0), pageCount - 1);
    const visible = characters.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const lines = visible.map(character => [
        character.is_archived ? "📦" : "✅",
        `**${displayName(character)}**`,
        ownerLabel(character.discord_user_id),
        `\`${character.proxy_name || "sans proxy"}\``
    ].join(" — "));

    const components = [];
    if (visible.length) {
        components.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("v2_staff_characters_manage_character")
                .setPlaceholder("Corriger ou supprimer un personnage")
                .addOptions(visible.map(character => ({
                    label: displayName(character).slice(0, 100),
                    value: String(character.id),
                    description: [
                        characterTypes.getDisplayLabel(character.character_type),
                        character.discord_user_id || "utilisateur introuvable",
                        character.proxy_name || "sans proxy"
                    ].join(" · ").slice(0, 100),
                    emoji: character.is_archived ? "📦" : "👤"
                })))
        ));
    }
    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`v2_staff_characters_roster_page:${page - 1}`)
            .setLabel("Précédent")
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`v2_staff_characters_roster_page:${page + 1}`)
            .setLabel("Suivant")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= pageCount - 1)
    ));
    components.push(require("../../pages/staff/StaffCharactersPage").navigationRow());

    return {
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("👥 Personnages du serveur")
            .setDescription([
                "Sélectionne n’importe quel personnage pour le corriger ou le supprimer, même si son ancien utilisateur Discord est introuvable.",
                "",
                lines.join("\n") || "Aucun personnage installé."
            ].join("\n"))
            .setFooter({
                text: `${characters.length} personnage(s) · Page ${page + 1}/${pageCount}`
            })],
        components
    };
}

module.exports = { build, PAGE_SIZE };
