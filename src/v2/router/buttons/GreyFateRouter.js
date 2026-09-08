const service = require("../../services/greyfate/GreyFateIntegrationService");
const staffPermissionDecisionService = require("../../core/services/StaffPermissionDecisionService");
const { replyPrivate } = require("../../core/services/InteractionResponseService");
const {ModalBuilder,TextInputBuilder,TextInputStyle,ActionRowBuilder}=require("discord.js");
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
    const isDuoMember = [duo.male_user_id, duo.female_user_id]
        .includes(interaction.user.id);
    if (!isDuoMember && !staffPermissionDecisionService.decide({
        interaction,
        permission: "scenes",
        write: true
    }).allowed) throw new Error("Action réservée au duo ou au staff.");
    service.assertDuoContext(duo, { guildId: interaction.guildId, contextId: duo.context_id });
    if(action==="greyfate_quest_answer"){
        const step=Number(encodedOccurrence),kind=extraParts[0]||"ANSWER";
        if(!Number.isInteger(step)||step<1||!["ANSWER","RP","FINAL"].includes(kind))throw new Error("Étape de quête invalide.");
        const modal=new ModalBuilder().setCustomId(`greyfate_quest_submit:${duoId}:${step}:${kind}`).setTitle(kind==="FINAL"?"Votre conclusion":"Proposer une réponse");
        if(kind==="FINAL")modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("who").setLabel("Qui a détourné le rendez-vous ?").setStyle(TextInputStyle.Short).setMaxLength(300)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("where").setLabel("Où ?").setStyle(TextInputStyle.Short).setMaxLength(300)),new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("what").setLabel("Qu'a-t-il voulu empêcher ?").setStyle(TextInputStyle.Paragraph).setMaxLength(800)));
        else modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("answer").setLabel(kind==="RP"?"Résumez votre scène pour le staff":"Votre réponse").setStyle(TextInputStyle.Paragraph).setMaxLength(1500)));
        await interaction.showModal(modal);return true;
    }
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
