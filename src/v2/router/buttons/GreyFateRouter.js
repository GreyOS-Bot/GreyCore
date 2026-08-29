const { PermissionFlagsBits } = require("discord.js");
const service = require("../../services/greyfate/GreyFateIntegrationService");
const { replyPrivate } = require("../../core/services/InteractionResponseService");
const {
    toPublicErrorMessage,
    GREYFATE_MESSAGES
} = require("../../core/services/PublicErrorMessageService");
module.exports = async interaction => {
    if (!interaction.isButton?.() || !interaction.customId?.startsWith("greyfate_")) return false;
    if (!service.enabled()) throw new Error("L’intégration GreyFate est temporairement désactivée.");
    const [action, duoId, encodedOccurrence, ...extraParts] = interaction.customId.split(":");
    const duo = service.duo(duoId);
    if (!duo || duo.guild_id !== interaction.guildId || duo.thread_id !== interaction.channelId) throw new Error("Cette action ne correspond pas à cette scène.");
    if (![duo.male_user_id, duo.female_user_id].includes(interaction.user.id) && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) throw new Error("Action réservée au duo ou au staff.");
    await interaction.deferUpdate();
    try {
        if (action === "greyfate_scene_start") { const result = await service.sceneStart(duo, interaction.user.id); if (!result.duplicate) { await interaction.editReply({ components: [] }); await service.sendAsWeaver(interaction.channel, "Le fil est noué. Votre scène commence maintenant."); } await replyPrivate(interaction, result.duplicate ? "Cette scène est déjà commencée." : "🧵 Scène ouverte."); return true; }
        if (action === "greyfate_duo_continue") {
            if (extraParts.length || !encodedOccurrence) {
                await replyPrivate(interaction, "Cette interface a été créée avec une ancienne version de GreyCore et ne peut plus être utilisée en sécurité.");
                return true;
            }
            const occurrence = service.decodeOccurrence(encodedOccurrence);
            if (!occurrence || !duo.closure_prompt_sent_at || duo.closure_prompt_sent_at !== occurrence || duo.closed_at) {
                await replyPrivate(interaction, "Cette proposition de prolongation n’est plus active.");
                return true;
            }
            const result = await service.continueDuo(duo, interaction.user.id, occurrence);
            if (!result.completed) {
                await replyPrivate(interaction, "Cette proposition de prolongation a déjà été traitée.");
                return true;
            }
            await interaction.editReply({ components: [] });
            await service.sendAsWeaver(interaction.channel, "Le fil se prolonge de **48 heures**.");
            await replyPrivate(interaction, "▶️ Scène prolongée.");
            return true;
        }
        if (action === "greyfate_duo_close") { await service.closeDuo(duo, interaction.user.id); await interaction.editReply({ components: [] }); await service.sendAsWeaver(interaction.channel, "Le fil se referme. Cette scène est **clôturée**."); await replyPrivate(interaction, "🏁 Scène clôturée."); return true; }
        return false;
    } catch (error) {
        await replyPrivate(
            interaction,
            `❌ ${toPublicErrorMessage(
                error,
                "L’action GreyFate n’a pas pu être effectuée.",
                GREYFATE_MESSAGES
            )}`
        ).catch(() => null);
        return true;
    }
};
