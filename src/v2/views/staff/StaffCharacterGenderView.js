const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");
const characterTypes = require("../../core/character/CharacterTypeCatalog");
const { navigationRow } = require("../../pages/staff/StaffCharactersPage");

const PAGE_SIZE = 20;

function genderLabel(value) {
    const normalized = String(value || "").trim().toLocaleLowerCase("fr");
    if (["femme", "féminin", "feminin", "female"].includes(normalized)) return "Femme";
    if (["homme", "masculin", "male"].includes(normalized)) return "Homme";
    if (normalized) return "Non genré";
    return "Non défini";
}

function build(roster, page = 0) {
    const sorted = [...roster].sort((left, right) =>
        String(left.firstname || left.proxy_name).localeCompare(
            String(right.firstname || right.proxy_name),
            "fr",
            { sensitivity: "base" }
        )
    );
    const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const currentPage = Math.min(Math.max(Number(page) || 0, 0), pageCount - 1);
    const visible = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    return {
        content: "",
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("☑️ Genres des personnages")
            .setDescription(visible.length
                ? visible.map(character => [
                    `**${character.firstname || character.proxy_name}**`,
                    characterTypes.getDisplayLabel(character.character_type),
                    genderLabel(character.gender),
                    `<@${character.discord_user_id}>`
                ].join(" · ")).join("\n")
                : "Aucun personnage validé et installé sur ce serveur.")
            .setFooter({ text: `Page ${currentPage + 1}/${pageCount} · ${sorted.length} personnage(s)` })],
        components: [
            ...(visible.some(character => genderLabel(character.gender) === "Non défini")
                ? [new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`v2_staff_character_gender_quick:${currentPage}`)
                        .setLabel("Saisie rapide des genres manquants")
                        .setEmoji("⚡")
                        .setStyle(ButtonStyle.Success)
                )]
                : []),
            ...(visible.length ? [new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`v2_staff_character_gender_select:${currentPage}`)
                    .setPlaceholder("Choisir un personnage")
                    .addOptions(visible.map(character => ({
                        label: String(character.firstname || character.proxy_name).slice(0, 100),
                        description: `${characterTypes.getDisplayLabel(character.character_type)} · ${genderLabel(character.gender)}`.slice(0, 100),
                        value: String(character.id)
                    })))
            )] : []),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`v2_staff_character_genders_page:${currentPage - 1}`)
                    .setLabel("Précédent")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId(`v2_staff_character_genders_page:${currentPage + 1}`)
                    .setLabel("Suivant")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= pageCount - 1)
            ),
            navigationRow()
        ]
    };
}

function buildChoice(character, page = 0, quick = false) {
    const name = character.firstname || character.proxy_name;
    return {
        content: "",
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`☑️ Genre de ${name}`.slice(0, 256))
            .setDescription([
                `Type : **${characterTypes.getDisplayLabel(character.character_type)}**`,
                `Utilisateur : <@${character.discord_user_id}>`,
                `Genre actuel : **${genderLabel(character.gender)}**`,
                "",
                "Choisis la valeur à enregistrer sur sa fiche."
            ].join("\n"))],
        components: [
            new ActionRowBuilder().addComponents(
                genderButton(character.id, "female", "Femme", "♀️", page, quick),
                genderButton(character.id, "male", "Homme", "♂️", page, quick),
                genderButton(character.id, "neutral", "Non genré", "⚪", page, quick)
            ),
            navigationRow()
        ]
    };
}

function genderButton(characterId, value, label, emoji, page, quick = false) {
    return new ButtonBuilder()
        .setCustomId(`v2_staff_character_gender_set:${characterId}:${value}:${page}:${quick ? "quick" : "list"}`)
        .setLabel(label)
        .setEmoji(emoji)
        .setStyle(ButtonStyle.Primary);
}

function buildQuick(roster, page = 0) {
    const missing = [...roster]
        .sort((left, right) => String(left.firstname || left.proxy_name).localeCompare(
            String(right.firstname || right.proxy_name), "fr", { sensitivity: "base" }
        ))
        .find(character => genderLabel(character.gender) === "Non défini");
    return missing ? buildChoice(missing, page, true) : build(roster, page);
}

module.exports = { build, buildChoice, buildQuick, genderLabel, PAGE_SIZE };
