const {
    EmbedBuilder,
    ActionRowBuilder,
    UserSelectMenuBuilder
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
                : `⚠️ Équilibre des PJ : écart de ${difference}`;
        lines.push("", balance);
    }

    return lines.join("\n");
}

function buildGlobal(characters) {
    return {
        content: "",
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("📊 Statistiques globales des personnages")
            .setDescription([
                "Personnages validés, installés et actifs sur ce serveur.",
                "Le genre renseigné sur la fiche est prioritaire ; sinon GreyCore fait une estimation prudente depuis le prénom.",
                "",
                statisticsText(characters)
            ].join("\n"))],
        components: [navigationRow()]
    };
}

function buildUserSelection() {
    return {
        content: "Choisis l’utilisateur dont tu souhaites consulter les statistiques.",
        embeds: [],
        components: [
            new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId("v2_staff_characters_statistics_user_select")
                    .setPlaceholder("Choisir un utilisateur")
                    .setMinValues(1)
                    .setMaxValues(1)
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
    genderCategory
};
