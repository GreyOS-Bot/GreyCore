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
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

async function closeConversationPanel(
    interaction
) {
    await interaction.update({
        content:
            "✅ SMS envoyé.",
        embeds: [],
        components: []
    });

    if (
        typeof interaction.message?.delete !==
        "function"
    ) {
        return;
    }

    try {
        await interaction.message.delete();
    } catch (error) {
        logger.warn(
            "Impossible de fermer l'interface SMS après l'envoi :",
            error
        );
    }
}

module.exports =
    async function PhoneMessageV2(
        interaction
    ) {

        const [
            ,
            conversationIdValue,
            characterId
        ] = interaction.customId.split(":");

        const conversationId =
            Number(
                conversationIdValue
            );

        const content =
            interaction.fields
                .getTextInputValue("content")
                .trim();

        if (!content) {
            return replyError(
                interaction,
                "Le message ne peut pas être vide."
            );
        }

        const character =
            CharacterV2Manager.getById(
                characterId
            );

        if (!character) {
            return replyError(
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
            return replyError(
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
            return replyError(
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
            return replyError(
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
        interaction
    );

} catch (error) {

    logger.error(
        "❌ Erreur lors de l’envoi du SMS V2 :",
        error
    );

    return replyError(
        interaction,
        error.message
    );

}

    };
