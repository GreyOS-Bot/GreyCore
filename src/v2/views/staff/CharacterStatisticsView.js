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

    const played = ["personnage_joue"].reduce((total, type) => {
        const count = counts.get(type);
        if (count) {
            total.total += count.total;
            total.female += count.female;
            total.male += count.male;
            total.unspecified += count.unspecified;
        }
        return total;
    }, { total: 0, female: 0, male: 0, unspecified: 0 });
    if (played.total) {
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

function buildUserSelection(characters, guild, requestedPage = 0, userNames = new Map()) {
    const owners = Array.from(new Set(
        characters
            .map(character => String(character.discord_user_id || "").trim())
            .filter(Boolean)
    )).map(userId => {
        const member = guild?.members?.cache?.get(userId);
        const balance = playedBalance(characters.filter(character =>
            String(character.discord_user_id || "").trim() === userId));
        return {
            userId,
            label: String(
                member?.displayName
                || member?.user?.globalName
                || member?.user?.username
                || userNames.get(userId)
                || `Utilisateur ${userId}`
            ).trim(),
            balance: {
                ...balance,
                difference: Math.abs(balance.female - balance.male)
            }
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
                "⚠️ signale automatiquement un écart d’au moins 2 entre les PJ féminins et masculins.",
                "",
                `**${owners.length} utilisateur(s) · Page ${page + 1}/${pageCount}**`
            ].join("\n"))],
        components: [
            ...(visible.length ? [new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("v2_staff_characters_statistics_user_select")
                    .setPlaceholder("Choisir un utilisateur")
                    .addOptions(visible.map(owner => ({
                        label: `${owner.balance.difference >= 2 ? "⚠️ " : ""}${owner.label}`.slice(0, 100),
                        value: owner.userId,
                        description: owner.balance.difference >= 2
                            ? `♀️ ${owner.balance.female} · ♂️ ${owner.balance.male} · Écart ${owner.balance.difference}`
                            : `✅ Équilibré · ♀️ ${owner.balance.female} · ♂️ ${owner.balance.male}`,
                        emoji: owner.balance.difference >= 2 ? "⚠️" : "👤"
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

function characterName(character) {
    return String(character.firstname || character.proxy_name || "Personnage sans nom").trim();
}

function genderDetails(characters) {
    const groups = { female: [], male: [], unspecified: [] };
    characters.filter(character => !character.is_archived).forEach(character => {
        groups[genderCategory(character.gender, character.firstname)].push(characterName(character));
    });
    const line = (emoji, label, values) =>
        `${emoji} **${label} (${values.length})** : ${values.length
            ? values.sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })).join(", ")
            : "Aucun"}`;
    return [
        line("♀️", "Femmes", groups.female),
        line("♂️", "Hommes", groups.male),
        line("⚪", "Non renseigné / non genré", groups.unspecified)
    ].join("\n");
}

function resolveUserName(userId, guild, userNames = new Map()) {
    const member = guild?.members?.cache?.get(String(userId));
    return String(member?.displayName || member?.user?.globalName
        || member?.user?.username || userNames.get(String(userId))
        || `Utilisateur ${userId}`).trim();
}

function genderFields(characters) {
    const groups = { female: [], male: [], unspecified: [] };
    characters.filter(character => !character.is_archived).forEach(character => {
        groups[genderCategory(character.gender, character.firstname)].push(characterName(character));
    });
    const field = (name, values) => ({
        name: `${name} — ${values.length}`,
        value: values.length
            ? values.sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
                .map(value => `• ${value}`).join("\n").slice(0, 1024)
            : "Aucun personnage"
    });
    return [
        field("♀️ Personnages féminins", groups.female),
        field("♂️ Personnages masculins", groups.male),
        field("⚪ Non renseignés / non genrés", groups.unspecified)
    ];
}

function playedBalance(characters) {
    return characters.filter(character => !character.is_archived)
        .filter(character => character.character_type === "personnage_joue")
        .reduce((counts, character) => {
            const category = genderCategory(character.gender, character.firstname);
            if (category === "female" || category === "male") counts[category] += 1;
            return counts;
        }, { female: 0, male: 0 });
}

function buildUser(userId, characters, guild = null, userNames = new Map()) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("👤 Statistiques d’un utilisateur")
        .setDescription([
            `Utilisateur : **${resolveUserName(userId, guild, userNames)}** (<@${userId}>)`,
            "Personnages validés, installés et actifs sur ce serveur.",
            "Le genre renseigné sur la fiche est prioritaire ; sinon GreyCore fait une estimation prudente depuis le prénom.",
            "",
            statisticsText(characters),
            "",
            "### Liste détaillée des personnages"
        ].join("\n"))
        .addFields(genderFields(characters));
    return {
        content: "",
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("v2_staff_characters_statistics_user")
                    .setLabel("Retour aux utilisateurs")
                    .setEmoji("⬅️")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`v2_staff_character_balance_alert:${userId}`)
                    .setLabel(`Envoyer l’alerte · écart ${Math.abs(playedBalance(characters).female - playedBalance(characters).male)}`)
                    .setEmoji("⚖️")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(Math.abs(playedBalance(characters).female - playedBalance(characters).male) < 2)
            ),
            navigationRow()
        ]
    };
}
module.exports = {
    buildGlobal,
    buildUserSelection,
    buildUser,
    statisticsText,
    genderCategory,
    genderDetails,
    genderFields,
    playedBalance,
    USER_PAGE_SIZE
};
