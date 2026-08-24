const { EmbedBuilder } = require("discord.js");
const rosterManager = require("../../managers/CharacterRosterV2Manager");
const characterTypes = require("../../core/character/CharacterTypeCatalog");
const statistics = require("../../views/staff/CharacterStatisticsView");

class CharacterBalanceAlertService {
    getUserBalance(roster, userId) {
        const counts = roster
            .filter(character => !character.is_archived)
            .filter(character => character.character_type === "personnage_joue")
            .filter(character => String(character.discord_user_id) === String(userId))
            .reduce((result, character) => {
                const category = statistics.genderCategory(character.gender, character.firstname);
                if (category === "female" || category === "male") result[category] += 1;
                return result;
            }, { female: 0, male: 0 });
        return {
            ...counts,
            difference: Math.abs(counts.female - counts.male)
        };
    }

    async notifyUser({ guild, userId, client, roster, requestedBy }) {
        const balance = this.getUserBalance(roster, userId);
        if (balance.difference < 2) {
            throw new Error("Cet utilisateur ne présente pas un écart suffisant pour recevoir une alerte.");
        }
        const user = await client?.users?.fetch?.(String(userId));
        if (!user?.send) {
            throw new Error("Cet utilisateur Discord est introuvable.");
        }
        await user.send({
            embeds: [new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle("⚖️ Alerte d’équilibre de tes PJ")
                .setDescription([
                    `Le staff de **${guild?.name || "ce serveur"}** souhaite attirer ton attention sur la répartition de tes personnages joués.`,
                    "",
                    `♀️ Personnages féminins : **${balance.female}**`,
                    `♂️ Personnages masculins : **${balance.male}**`,
                    `Écart actuel : **${balance.difference}**`,
                    "",
                    "Pour tes prochaines créations, pense si possible à privilégier le genre le moins représenté afin de contribuer à l’équilibre du serveur.",
                    "Cette notification est informative et a été envoyée par GreyCore à la demande du staff."
                ].join("\n"))
                .setFooter({ text: `Demande du staff · ${requestedBy}` })]
        });
        return balance;
    }

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
