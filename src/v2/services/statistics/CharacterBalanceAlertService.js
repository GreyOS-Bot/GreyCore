const { EmbedBuilder } = require("discord.js");
const rosterManager = require("../../managers/CharacterRosterV2Manager");
const characterTypes = require("../../core/character/CharacterTypeCatalog");
const statistics = require("../../views/staff/CharacterStatisticsView");

class CharacterBalanceAlertService {
    async notifyAfterApproval({ guildId, characterId, channel }) {
        if (!channel?.isTextBased?.() || typeof channel.send !== "function") {
            return false;
        }

        const roster = rosterManager.getRoster(guildId, { includeArchived: false });
        const approved = roster.find(character => String(character.id) === String(characterId));
        if (!approved || approved.character_type !== "personnage_joue") {
            return false;
        }

        const category = statistics.genderCategory(approved.gender, approved.firstname);
        if (!["female", "male"].includes(category)) {
            return false;
        }

        const balance = list => list
            .filter(character => character.character_type === "personnage_joue")
            .reduce((counts, character) => {
                const gender = statistics.genderCategory(character.gender, character.firstname);
                if (gender === "female" || gender === "male") counts[gender] += 1;
                return counts;
            }, { female: 0, male: 0 });

        const current = balance(roster);
        const previous = { ...current, [category]: current[category] - 1 };
        const currentDifference = Math.abs(current.female - current.male);
        const previousDifference = Math.abs(previous.female - previous.male);

        if (currentDifference < 2 || currentDifference <= previousDifference) {
            return false;
        }

        await channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle("🚨 Alerte équilibre des PJ")
                .setDescription([
                    `La validation de **${approved.firstname || approved.proxy_name}** porte l’écart à **${currentDifference}**.`,
                    `♀️ Femmes : **${current.female}** · ♂️ Hommes : **${current.male}**`,
                    "Le détail complet est disponible dans **/staff → Personnages → Statistiques**."
                ].join("\n"))]
        });
        return true;
    }
}

module.exports = new CharacterBalanceAlertService();
