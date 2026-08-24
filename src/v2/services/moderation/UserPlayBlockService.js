const repository = require("../../repositories/UserPlayBlockRepository");

class UserPlayBlockService {
    get(guildId, discordUserId) {
        if (!guildId || !discordUserId) return null;
        return repository.get(guildId, discordUserId);
    }

    isBlocked(guildId, discordUserId) {
        return Boolean(this.get(guildId, discordUserId));
    }

    list(guildId) {
        return repository.list(guildId);
    }

    block({ guildId, discordUserId, reason, blockedBy }) {
        const normalizedReason = String(reason || "").trim();
        if (!guildId || !discordUserId || !blockedBy) {
            throw new Error("Les informations du blocage sont incomplètes.");
        }
        if (!normalizedReason) {
            throw new Error("Le motif du blocage est obligatoire.");
        }

        return repository.save({
            guildId,
            discordUserId,
            reason: normalizedReason.slice(0, 1000),
            blockedBy,
            now: new Date().toISOString()
        });
    }

    unblock(guildId, discordUserId) {
        return repository.remove(guildId, discordUserId);
    }

    async blockInteraction(interaction) {
        if (!interaction.guildId || !interaction.user?.id || interaction.isAutocomplete?.()) {
            return false;
        }
        if (interaction.commandName === "blocage") return false;
        const block = this.get(interaction.guildId, interaction.user.id);
        if (!block) return false;
        const staffPolicy = require("../../core/policies/StaffPermissionPolicy");
        if (staffPolicy.canOpenCenter(interaction)) return false;
        await require("../../core/services/InteractionResponseService").replyError(
            interaction,
            `Ton accès au jeu GreyCore est temporairement suspendu sur ce serveur.\n**Motif :** ${block.reason}\nContacte le staff si tu souhaites faire le point.`
        );
        return true;
    }
}

module.exports = new UserPlayBlockService();
