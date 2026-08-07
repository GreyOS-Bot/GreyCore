const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const characterTypes = require("../../core/character/CharacterTypeCatalog");

const PAGE_SIZE = 15;

function normalize(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("fr");
}

function displayName(character) {
    return String(
        character.firstname
        || character.proxy_name
        || "Personnage sans nom"
    ).trim();
}

function ownerLabel(discordUserId) {
    if (!discordUserId || String(discordUserId).startsWith("anonymized_")) {
        return "Ancien utilisateur (anonymisé)";
    }
    return `<@${discordUserId}>`;
}

function letterOptions(startCode, endCode) {
    return Array.from(
        { length: endCode - startCode + 1 },
        (_, index) => {
            const letter = String.fromCharCode(startCode + index);
            return { label: letter, value: letter.toLowerCase() };
        }
    );
}

function build(characters, options = {}) {
    const requestedLetter = String(options.letter || "all").toLowerCase();
    const filtered = characters
        .filter(character => !character.is_archived)
        .filter(character => (
            requestedLetter === "all"
            || normalize(displayName(character)).startsWith(requestedLetter)
        ))
        .sort((left, right) => displayName(left).localeCompare(
            displayName(right),
            "fr",
            { sensitivity: "base" }
        ));

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(Math.max(Number(options.page) || 0, 0), pageCount - 1);
    const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const scope = requestedLetter === "all"
        ? "Tous les prénoms"
        : `Prénoms commençant par ${requestedLetter.toUpperCase()}`;

    const description = visible.length
        ? visible.map(character => [
            `• **${displayName(character)}**`,
            ownerLabel(character.discord_user_id),
            characterTypes.getDisplayLabel(character.character_type)
        ].join(" — ")).join("\n")
        : "Aucun personnage installé ne correspond à cette lettre.";

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("📖 Annuaire des personnages")
        .setDescription([
            "Consulte les prénoms déjà utilisés sur ce serveur avant de créer ton personnage.",
            "Seuls les personnages validés, installés et non archivés apparaissent ici.",
            "",
            `**${scope}**`,
            description
        ].join("\n"))
        .setFooter({
            text: `GreyCore · ${filtered.length} personnage(s) · Page ${page + 1}/${pageCount}`
        });

    const characterSelector = visible.length
        ? new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("v2_player_directory_character")
                .setPlaceholder("Voir la fiche d’un personnage")
                .addOptions(visible.map(character => ({
                    label: displayName(character).slice(0, 100),
                    value: String(character.id),
                    description: `${characterTypes.getDisplayLabel(character.character_type)} · ${
                        !character.discord_user_id || String(character.discord_user_id).startsWith("anonymized_")
                            ? "Ancien utilisateur"
                            : `Utilisateur ${character.discord_user_id}`
                    }`.slice(0, 100),
                    emoji: "👤"
                })))
        )
        : null;

    const firstLetters = new StringSelectMenuBuilder()
        .setCustomId("v2_player_directory_letter_am")
        .setPlaceholder("Toutes les lettres ou A à M")
        .addOptions([
            { label: "Tous les prénoms", value: "all", emoji: "📚" },
            ...letterOptions(65, 77)
        ]);

    const lastLetters = new StringSelectMenuBuilder()
        .setCustomId("v2_player_directory_letter_nz")
        .setPlaceholder("Lettres N à Z")
        .addOptions(letterOptions(78, 90));

    const pagination = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`v2_player_directory_page:${requestedLetter}:${page - 1}`)
            .setLabel("Précédent")
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`v2_player_directory_page:${requestedLetter}:${page + 1}`)
            .setLabel("Suivant")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= pageCount - 1)
    );

    const navigation = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("v2_library_home")
            .setLabel("Accueil")
            .setEmoji("🏠")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("character_close")
            .setLabel("Fermer")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Secondary)
    );

    return {
        embeds: [embed],
        components: [
            ...(characterSelector ? [characterSelector] : []),
            new ActionRowBuilder().addComponents(firstLetters),
            new ActionRowBuilder().addComponents(lastLetters),
            pagination,
            navigation
        ]
    };
}

module.exports = { build, PAGE_SIZE };
