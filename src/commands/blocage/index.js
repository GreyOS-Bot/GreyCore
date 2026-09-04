const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const decisionService = require("../../v2/core/services/StaffPermissionDecisionService");
const service = require("../../v2/services/moderation/UserPlayBlockService");
const { replyPrivate, replyError, deferPrivate } = require("../../v2/core/services/InteractionResponseService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blocage")
        .setDescription("Suspend ou rétablit l’accès au jeu d’un utilisateur.")
        .addSubcommand(sub => sub.setName("bloquer")
            .setDescription("Empêche temporairement un utilisateur de jouer avec GreyCore.")
            .addUserOption(option => option.setName("utilisateur").setDescription("Utilisateur à bloquer").setRequired(true))
            .addStringOption(option => option.setName("motif").setDescription("Motif communiqué à l’utilisateur").setRequired(true).setMaxLength(1000)))
        .addSubcommand(sub => sub.setName("debloquer")
            .setDescription("Rétablit l’accès au jeu d’un utilisateur.")
            .addUserOption(option => option.setName("utilisateur").setDescription("Utilisateur à débloquer").setRequired(true)))
        .addSubcommand(sub => sub.setName("liste").setDescription("Affiche les utilisateurs actuellement bloqués.")),

    async execute(interaction) {
        const action = interaction.options.getSubcommand();
        const allowed = decisionService.decide({
            interaction,
            permission: "characters",
            write: action !== "liste"
        }).allowed;
        if (!interaction.guildId || !allowed) {
            return replyError(interaction, "Cette commande est réservée au staff chargé des personnages.");
        }
        if (action === "liste") {
            const blocks = service.list(interaction.guildId);
            return replyPrivate(interaction, {
                embeds: [new EmbedBuilder().setColor(blocks.length ? 0xED4245 : 0x57F287)
                    .setTitle("⛔ Utilisateurs bloqués")
                    .setDescription(blocks.length
                        ? blocks.map(block => `• <@${block.discord_user_id}> — ${block.reason}\n  Par <@${block.blocked_by}>`).join("\n").slice(0, 4000)
                        : "Aucun utilisateur n’est actuellement bloqué sur ce serveur.")]
            });
        }
        const user = interaction.options.getUser("utilisateur", true);
        if (user.bot) return replyError(interaction, "Un bot ne peut pas être concerné par ce blocage.");
        if (user.id === interaction.user.id) return replyError(interaction, "Tu ne peux pas modifier ton propre accès avec cette commande.");
        await deferPrivate(interaction);
        if (action === "bloquer") {
            const reason = interaction.options.getString("motif", true);
            service.block({ guildId: interaction.guildId, discordUserId: user.id, reason, blockedBy: interaction.user.id });
            await user.send(`⛔ Ton accès au jeu GreyCore sur **${interaction.guild?.name || "ce serveur"}** est temporairement suspendu.\n**Motif :** ${reason}\nTes personnages et leurs données sont conservés. Contacte le staff pour connaître les conditions de déblocage.`).catch(() => null);
            return interaction.editReply(`⛔ <@${user.id}> ne peut plus utiliser GreyCore pour jouer sur ce serveur. Ses données sont conservées.`);
        }
        const removed = service.unblock(interaction.guildId, user.id);
        if (!removed) return interaction.editReply(`ℹ️ <@${user.id}> n’était pas bloqué sur ce serveur.`);
        await user.send(`✅ Ton accès au jeu GreyCore sur **${interaction.guild?.name || "ce serveur"}** a été rétabli par le staff.`).catch(() => null);
        return interaction.editReply(`✅ L’accès GreyCore de <@${user.id}> est rétabli sur ce serveur.`);
    }
};
