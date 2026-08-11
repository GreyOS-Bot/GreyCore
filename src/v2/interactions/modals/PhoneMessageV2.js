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
    preserveSource,
    sentLabel = "SMS"
) {
    if (preserveSource) {
        return interaction.editReply({
            content: `✅ ${sentLabel} envoyé.`
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
        content: `✅ ${sentLabel} envoyé.`
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
        const isEmail =
            interaction.customId.startsWith(
                "v2_phone_email_modal:"
            );

        const subject = isEmail
            ? interaction.fields
                .getTextInputValue("subject")
                .trim()
            : null;

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

            const send =
                isEmail
                    ? PhoneServiceV2.sendEmail
                        .bind(PhoneServiceV2)
                    : PhoneServiceV2.sendSms
                        .bind(PhoneServiceV2);

            await send({
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
                content,
                subject
            });

            return closeConversationPanel(
                interaction,
                source === "quick_reply",
                isEmail ? "E-mail" : "SMS"
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
