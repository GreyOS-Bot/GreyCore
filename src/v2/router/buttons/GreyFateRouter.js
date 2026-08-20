const { PermissionFlagsBits } = require("discord.js");
const service = require("../../services/greyfate/GreyFateIntegrationService");
const { replyPrivate } = require("../../core/services/InteractionResponseService");
module.exports = async interaction => {
    if (!interaction.isButton?.() || !interaction.customId?.startsWith("greyfate_")) return false;
    if (!service.enabled()) throw new Error("L’intégration GreyFate est temporairement désactivée.");
    const [action, duoId] = interaction.customId.split(":");
    const duo = service.duo(duoId);
    if (!duo || duo.guild_id !== interaction.guildId || duo.thread_id !== interaction.channelId) throw new Error("Cette action ne correspond pas à cette scène.");
    if (![duo.male_user_id, duo.female_user_id].includes(interaction.user.id) && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) throw new Error("Action réservée au duo ou au staff.");
    await interaction.deferUpdate();
    try {
        if (action === "greyfate_scene_start") { const result = await service.sceneStart(duo, interaction.user.id); if (!result.duplicate) { await interaction.editReply({ components: [] }); await service.sendAsWeaver(interaction.channel, "Le fil est noué. Votre scène commence maintenant."); } await replyPrivate(interaction, result.duplicate ? "Cette scène est déjà commencée." : "🧵 Scène ouverte."); return true; }
        if (action === "greyfate_duo_continue") { await service.continueDuo(duo, interaction.user.id); await interaction.editReply({ components: [] }); await service.sendAsWeaver(interaction.channel, "Le fil se prolonge de **48 heures**."); await replyPrivate(interaction, "▶️ Scène prolongée."); return true; }
        if (action === "greyfate_duo_close") { await service.closeDuo(duo, interaction.user.id); await interaction.editReply({ components: [] }); await service.sendAsWeaver(interaction.channel, "Le fil se referme. Cette scène est **clôturée**."); await replyPrivate(interaction, "🏁 Scène clôturée."); return true; }
        return false;
    } catch (error) { await replyPrivate(interaction, `❌ ${error.message}`).catch(() => null); return true; }
};
