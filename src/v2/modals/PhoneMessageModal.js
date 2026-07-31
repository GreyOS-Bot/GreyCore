const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const PhoneV2Manager =
    require(
        "../managers/PhoneV2Manager"
    );

const PhoneConversationV2Manager =
    require(
        "../managers/PhoneConversationV2Manager"
    );

const CharacterDashboardManager =
    require(
        "../services/dashboard/CharacterDashboardManager"
    );

const {
    replyError
} = require(
    "../core/services/InteractionResponseService"
);

module.exports = {

    async show(
        interaction,
        conversationId,
        characterId,
        options = {}
    ) {

        const dashboardData =
            CharacterDashboardManager
                .getPlayableDashboardData(
                    characterId,
                    {
                        guildId:
                            interaction.guildId
                    }
                );

        if (
            !dashboardData
            ||
            !dashboardData.continuity
        ) {
            return replyError(
                interaction,
                "Continuité introuvable."
            );
        }

        if (
            String(
                dashboardData
                    .character
                    .discord_user_id
            )
            !==
            String(
                interaction.user.id
            )
        ) {
            return replyError(
                interaction,
                "Ce personnage ne vous appartient pas."
            );
        }

        const phone =
            PhoneV2Manager
                .getPhoneByContinuity(
                    dashboardData
                        .continuity
                        .id
                );

        if (!phone) {
            return replyError(
                interaction,
                "Téléphone introuvable."
            );
        }

        const participants =
            PhoneConversationV2Manager
                .getParticipants(
                    Number(conversationId)
                );

        const conversation =
            PhoneV2Manager.getConversationById(
                Number(conversationId)
            );

        if (!conversation) {
            return replyError(
                interaction,
                "Conversation introuvable."
            );
        }

        const currentParticipant =
            participants.find(
                participant =>
                    Number(
                        participant.phone_id
                    ) ===
                    Number(phone.id)
            );

        if (!currentParticipant) {
            return replyError(
                interaction,
                "Ce personnage ne participe pas à cette conversation."
            );
        }

        const receiverParticipant =
            participants.find(
                participant =>
                    Number(
                        participant.phone_id
                    ) !==
                    Number(phone.id)
            );

        if (!receiverParticipant) {
            return replyError(
                interaction,
                "Destinataire introuvable."
            );
        }

        const receiverName =
            conversation.conversation_type === "group"
                ? PhoneConversationV2Manager
                    .getDisplayName(
                        conversation,
                        phone.id
                    )
                : receiverParticipant
                    .character_name
                || receiverParticipant
                    .external_name
                || receiverParticipant
                    .phone_number
                || receiverParticipant
                    .external_phone
                || "ce contact";

        /*
         * Discord limite le titre d’une modale
         * à 45 caractères.
         */
        const modalTitle =
            `${
                conversation.conversation_type === "group"
                    ? "Écrire dans"
                    : "Répondre à"
            } ${receiverName}`
                .slice(0, 45);

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `v2_phone_message_modal:${conversationId}:${characterId}:${options.source || "panel"}`
                )
                .setTitle(
                    modalTitle
                );

        const contentInput =
            new TextInputBuilder()
                .setCustomId("content")
                .setLabel("Message")
                .setPlaceholder(
                    `${
                        conversation.conversation_type === "group"
                            ? "Écrivez votre SMS dans"
                            : "Écrivez votre SMS à"
                    } ${receiverName}...`
                        .slice(0, 100)
                )
                .setRequired(true)
                .setMaxLength(2000)
                .setStyle(
                    TextInputStyle.Paragraph
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    contentInput
                )
        );

        await interaction.showModal(
            modal
        );

    }

};
