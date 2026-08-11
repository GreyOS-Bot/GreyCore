const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const PhoneV2Manager = require("../managers/PhoneV2Manager");
const CharacterDashboardManager = require("../services/dashboard/CharacterDashboardManager");
const { replyError } = require("../core/services/InteractionResponseService");
const fastAcknowledgement = require("../core/services/FastInteractionAcknowledgementService");

module.exports = {
    async show(interaction, callId, characterId) {
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
            return replyError(interaction, "Cette messagerie n’est plus disponible.");
        }

        const modal = new ModalBuilder()
            .setCustomId(`v2_phone_voicemail_modal:${callId}:${characterId}`)
            .setTitle("Laisser un message vocal")
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("content")
                        .setLabel("Message")
                        .setPlaceholder("Écris le message laissé sur la messagerie…")
                        .setStyle(TextInputStyle.Paragraph)
                        .setMinLength(1)
                        .setMaxLength(2000)
                        .setRequired(true)
                )
            );

        await fastAcknowledgement.showModal(interaction, modal);
    }
};
