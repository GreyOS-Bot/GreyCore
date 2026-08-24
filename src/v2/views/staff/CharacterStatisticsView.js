const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");
const characterTypes = require("../../core/character/CharacterTypeCatalog");
const firstNameGender = require("../../core/character/FirstNameGenderInference");
const { navigationRow } = require("../../pages/staff/StaffCharactersPage");

function normalize(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase("fr");
}

function genderCategory(value, firstname) {
    const normalized = normalize(value);
    if (["f", "femme", "feminin", "female", "woman"].includes(normalized)) {
        return "female";
    }
    if (["m", "homme", "masculin", "male", "man"].includes(normalized)) {
        return "male";
    }
    if (normalized) {
        return "unspecified";
    }
    return firstNameGender.infer(firstname);
}

function statisticsText(characters) {
    const active = characters.filter(character => !character.is_archived);
    const counts = new Map();

    for (const character of active) {
        const type = String(character.character_type || "non_renseigne").trim();
        const current = counts.get(type) || {
            total: 0,
            female: 0,
            male: 0,
            unspecified: 0
        };
        current.total += 1;
        current[genderCategory(character.gender, character.firstname)] += 1;
        counts.set(type, current);
    }

    const catalogOrder = Object.keys(characterTypes.CHARACTER_TYPES);
    const orderedTypes = [
        ...catalogOrder.filter(type => counts.has(type)),
        ...Array.from(counts.keys()).filter(type => !catalogOrder.includes(type))
    ];
    const lines = [`**Total : ${active.length} personnage(s)**`];

    for (const type of orderedTypes) {
        const count = counts.get(type);
        const unspecified = count.unspecified
            ? ` · ⚪ Non renseigné : ${count.unspecified}`
            : "";
        lines.push(
            "",
            `**${characterTypes.getDisplayLabel(type) || "Type non renseigné"} — ${count.total}**`,
            `♀️ Femmes : ${count.female} · ♂️ Hommes : ${count.male}${unspecified}`
        );
    }

    const played = counts.get("personnage_joue");
    if (played) {
        const difference = Math.abs(played.female - played.male);
        const balance = played.female === 0 && played.male === 0
            ? "⚪ Équilibre des PJ : genres non renseignés"
            : difference === 0
                ? "✅ Équilibre des PJ : parfait"
                : difference >= 2
                    ? `🚨 **Alerte équilibre des PJ : écart de ${difference}** (seuil : 2)`
                    : "🟡 Équilibre des PJ : léger écart de 1";
        lines.push("", balance);
    }

    return lines.join("\n");
}

function buildGlobal(characters) {
    const statistics = statisticsText(characters);
    return {
        content: "",
        embeds: [new EmbedBuilder()
            .setColor(statistics.includes("🚨") ? 0xED4245 : 0x5865F2)
            .setTitle("📊 Statistiques globales des personnages")
            .setDescription([
                "Personnages validés, installés et actifs sur ce serveur.",
                "Le genre renseigné sur la fiche est prioritaire ; sinon GreyCore fait une estimation prudente depuis le prénom.",
                "",
                statistics
            ].join("\n"))],
        components: [navigationRow()]
    };
}

const USER_PAGE_SIZE = 20;

function buildUserSelection(characters, guild, requestedPage = 0) {
    const owners = Array.from(new Set(
        characters
            .map(character => String(character.discord_user_id || "").trim())
            .filter(Boolean)
    )).map(userId => {
        const member = guild?.members?.cache?.get(userId);
        return {
            userId,
            label: String(
                member?.displayName
                || member?.user?.globalName
                || member?.user?.username
                || `Utilisateur ${userId}`
            ).trim()
        };
    }).sort((left, right) => left.label.localeCompare(
        right.label,
        "fr",
        { sensitivity: "base" }
    ));
    const pageCount = Math.max(1, Math.ceil(owners.length / USER_PAGE_SIZE));
    const page = Math.min(Math.max(Number(requestedPage) || 0, 0), pageCount - 1);
    const visible = owners.slice(page * USER_PAGE_SIZE, (page + 1) * USER_PAGE_SIZE);

    return {
        content: "",
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("👤 Statistiques par utilisateur")
            .setDescription([
                "Cette liste contient tous les propriétaires de personnages installés dans GreyCore, y compris ceux que Discord ne propose pas spontanément.",
                "",
                `**${owners.length} utilisateur(s) · Page ${page + 1}/${pageCount}**`
            ].join("\n"))],
        components: [
            ...(visible.length ? [new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("v2_staff_characters_statistics_user_select")
                    .setPlaceholder("Choisir un utilisateur")
                    .addOptions(visible.map(owner => ({
                        label: owner.label.slice(0, 100),
                        value: owner.userId,
                        description: `Identifiant ${owner.userId}`.slice(0, 100),
                        emoji: "👤"
                    })))
            )] : []),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`v2_staff_characters_statistics_users_page:${page - 1}`)
                    .setLabel("Précédent")
                    .setEmoji("◀️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId(`v2_staff_characters_statistics_users_page:${page + 1}`)
                    .setLabel("Suivant")
                    .setEmoji("▶️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= pageCount - 1)
            ),
            navigationRow()
        ]
    };
}

function buildUser(userId, characters) {
    return {
        content: "",
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("👤 Statistiques d’un utilisateur")
            .setDescription([
                `Utilisateur : <@${userId}>`,
                "Personnages validés, installés et actifs sur ce serveur.",
                "Le genre renseigné sur la fiche est prioritaire ; sinon GreyCore fait une estimation prudente depuis le prénom.",
                "",
                statisticsText(characters)
            ].join("\n"))],
        components: [navigationRow()]
    };
}

module.exports = {
    buildGlobal,
    buildUserSelection,
    buildUser,
    statisticsText,
    genderCategory,
    USER_PAGE_SIZE
};
