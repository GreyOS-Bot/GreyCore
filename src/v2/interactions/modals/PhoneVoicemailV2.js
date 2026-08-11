const PhoneV2Manager = require("../../managers/PhoneV2Manager");
const CharacterDashboardManager = require("../../services/dashboard/CharacterDashboardManager");
const PhoneService = require("../../services/phone/PhoneService");
const {
    deferPrivate,
    editOrReplyError
} = require("../../core/services/InteractionResponseService");

module.exports = async function phoneVoicemailV2(interaction) {
    const [, callIdValue, characterId] = interaction.customId.split(":");
    const callId = Number(callIdValue);
    const content = interaction.fields.getTextInputValue("content").trim();

    await deferPrivate(interaction);

    const dashboard = CharacterDashboardManager.getPlayableDashboardData(
        characterId,
        { guildId: interaction.guildId }
    );
    const phone = dashboard?.continuity
        ? PhoneV2Manager.getPhoneByContinuity(dashboard.continuity.id)
        : null;
    const call = PhoneV2Manager.getCallById(callId);

    if (
        !dashboard?.character
        || String(dashboard.character.discord_user_id) !== String(interaction.user.id)
        || !phone
        || !call
        || call.status !== "ringing"
        || Number(call.caller_phone_id) !== Number(phone.id)
    ) {
        return editOrReplyError(interaction, "Cet appel n’est plus en attente.");
    }

    const conversation = PhoneV2Manager.getOrCreateConversation(
        call.caller_phone_id,
        call.receiver_phone_id
    );

    try {
        await PhoneService.sendVoicemail({
            client: interaction.client,
            guildId: interaction.guildId,
            channel: interaction.channel,
            senderCharacter: dashboard.character,
            senderPhone: phone,
            conversationId: conversation.id,
            content
        });

        PhoneV2Manager.markMissed(call.id);

        return interaction.editReply({
            content: "✅ Message laissé sur la messagerie. L’appel est marqué sans réponse."
        });
    } catch (error) {
        return editOrReplyError(
            interaction,
            error.message || "Impossible de laisser ce message."
        );
    }
};
