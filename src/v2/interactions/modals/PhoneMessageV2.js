const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "PhoneMessageV2"
    );

const CharacterV2Manager =
    require(
        "../../managers/CharacterV2Manager"
    );

const PhoneV2Manager =
    require(
        "../../managers/PhoneV2Manager"
    );

const CharacterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const PhoneServiceV2 =
    require(
        "../../services/phone/PhoneService"
    );

const {
    deferPrivate,
    editOrReplyError
} = require(
    "../../core/services/InteractionResponseService"
);

async function closeConversationPanel(
    interaction,
    preserveSource
) {
    if (preserveSource) {
        return interaction.editReply({
            content: "✅ SMS envoyé."
        });
    }

    if (
        typeof interaction.message?.delete ===
            "function"
    ) {
        try {
            await interaction.message.delete();
        } catch (error) {
            logger.warn(
                "Impossible de fermer l'interface SMS après l'envoi :",
                error
            );
        }
    }

    return interaction.editReply({
        content: "✅ SMS envoyé."
    });
}

module.exports =
    async function PhoneMessageV2(
        interaction
    ) {

        const [
            ,
            conversationIdValue,
            characterId,
            source
        ] = interaction.customId.split(":");

        const conversationId =
            Number(
                conversationIdValue
            );

        const content =
            interaction.fields
                .getTextInputValue("content")
                .trim();

        await deferPrivate(interaction);

        if (!content) {
            return editOrReplyError(
                interaction,
                "Le message ne peut pas être vide."
            );
        }

        const character =
            CharacterV2Manager.getById(
                characterId
            );

        if (!character) {
            return editOrReplyError(
                interaction,
                "Personnage introuvable."
            );
        }

        if (
            String(
                character.discord_user_id
            ) !==
            String(
                interaction.user.id
            )
        ) {
            return editOrReplyError(
                interaction,
                "Ce personnage ne vous appartient pas."
            );
        }

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
            return editOrReplyError(
                interaction,
                "Continuité introuvable."
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
            return editOrReplyError(
                interaction,
                "Téléphone introuvable."
            );
        }

        try {

    await PhoneServiceV2.sendSms({
    client:
        interaction.client,

    guildId:
        interaction.guildId,

    channel:
        interaction.channel,

    senderCharacter:
        character,

    senderPhone:
        phone,

    conversationId,
    content
});

    return closeConversationPanel(
        interaction,
        source === "quick_reply"
    );

} catch (error) {

    logger.error(
        "❌ Erreur lors de l’envoi du SMS V2 :",
        error
    );

    return editOrReplyError(
        interaction,
        error.message
    );

}

    };
