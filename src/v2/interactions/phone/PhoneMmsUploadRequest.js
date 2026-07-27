const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const phoneManager =
    require("../../managers/PhoneV2Manager");

const conversationManager =
    require(
        "../../managers/PhoneConversationV2Manager"
    );

const pendingActionManager =
    require("../../managers/PendingActionManager");

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

async function start(
    interaction,
    conversationId,
    characterId
) {
    const dashboardData =
        characterDashboardManager
            .getPlayableDashboardData(
                characterId,
                {
                    guildId:
                        interaction.guildId
                }
            );

    if (
        !dashboardData
        || !dashboardData.continuity
    ) {
        return replyError(
            interaction,
            "Ce personnage n’est pas jouable sur ce serveur."
        );
    }

    if (
        String(
            dashboardData.character.discord_user_id
        ) !== String(interaction.user.id)) {
        return replyError(
            interaction,
            "Tu ne peux pas utiliser le téléphone de ce personnage."
        );
    }

    const phone =
        phoneManager.getPhoneByContinuity(
            dashboardData.continuity.id
        );

    const conversation =
        phoneManager.getConversationById(
            conversationId
        );

    if (!phone || !conversation) {
        return replyError(
            interaction,
            "Le téléphone ou la conversation est introuvable."
        );
    }

    if (
        !conversationManager.isParticipant(
            conversation.id,
            phone.id
        )
    ) {
        return replyError(
            interaction,
            "Ce téléphone ne participe pas à cette conversation."
        );
    }

    pendingActionManager.create({
        userId:
            interaction.user.id,
        type:
            "phone_mms_upload",
        guildId:
            interaction.guildId,
        channelId:
            interaction.channelId,
        characterId,
        continuityId:
            dashboardData.continuity.id,
        conversationId:
            conversation.id
    });

    return replyPrivate(
        interaction,
        [
            "🖼️ Envoie maintenant une image ou un GIF dans ce salon.",
            "Tu peux ajouter une légende dans le même message.",
            "Tu disposes de 5 minutes."
        ].join("\n")
    );
}

module.exports = {
    start
};
