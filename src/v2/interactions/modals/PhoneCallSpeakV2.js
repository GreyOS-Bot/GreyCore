const PhoneV2Manager =
    require(
        "../../managers/PhoneV2Manager"
    );

const PhoneCallV2Manager =
    require(
        "../../managers/PhoneCallV2Manager"
    );

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "PhoneCallSpeakV2"
    );

const CharacterV2Manager =
    require(
        "../../managers/CharacterV2Manager"
    );

const PhoneCallSessionManager =
    require(
        "../../managers/PhoneCallSessionManager"
    );

const PhoneCallServiceV2 =
    require(
        "../../services/phone/PhoneCallService"
    );

const CharacterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const {
    privatePayload,
    editOrReplyError
} = require(
    "../../core/services/InteractionResponseService"
);

class PhoneCallSpeakV2 {

    getParticipantContext(
        interaction,
        call,
        characterId
    ) {

        const character =
            CharacterV2Manager
                .getById(
                    characterId
                );

        if (!character) {

            throw new Error(
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

            throw new Error(
                "Vous ne pouvez pas parler avec ce personnage."
            );

        }

        const callerPhone =
            PhoneV2Manager
                .getPhoneById(
                    call.caller_phone_id
                );

        const receiverPhone =
            PhoneV2Manager
                .getPhoneById(
                    call.receiver_phone_id
                );

        if (
            !callerPhone
            ||
            !receiverPhone
        ) {

            throw new Error(
                "Les téléphones de cet appel sont introuvables."
            );

        }

        const callerContinuity =
            PhoneV2Manager
                .getContinuityByPhone(
                    callerPhone.id
                );

        const receiverContinuity =
            PhoneV2Manager
                .getContinuityByPhone(
                    receiverPhone.id
                );

        let phone = null;
        let otherPhone = null;

        if (
            callerContinuity
            &&
            String(
                callerContinuity.character_id
            ) ===
            String(
                character.id
            )
        ) {

            phone =
                callerPhone;

            otherPhone =
                receiverPhone;

        } else if (
            receiverContinuity
            &&
            String(
                receiverContinuity.character_id
            ) ===
            String(
                character.id
            )
        ) {

            phone =
                receiverPhone;

            otherPhone =
                callerPhone;

        }

        if (
            !phone
            ||
            !otherPhone
        ) {

            throw new Error(
                "Ce personnage ne participe pas à cet appel."
            );

        }

        const otherContinuity =
            PhoneV2Manager
                .getContinuityByPhone(
                    otherPhone.id
                );

        if (!otherContinuity) {

            throw new Error(
                "La continuité du correspondant est introuvable."
            );

        }

        const otherCharacter =
            CharacterV2Manager
                .getById(
                    otherContinuity.character_id
                );

        if (!otherCharacter) {

            throw new Error(
                "Le correspondant est introuvable."
            );

        }

        const characterDashboard =
            CharacterDashboardManager
                .getPlayableDashboardData(
                    character.id,
                    {
                        guildId:
                            interaction.guildId,
                        continuityId:
                            phone.continuity_id
                    }
                );

        const otherDashboard =
            CharacterDashboardManager
                .getPlayableDashboardData(
                    otherCharacter.id,
                    {
                        guildId:
                            interaction.guildId,
                        continuityId:
                            otherContinuity.id
                    }
                );

        return {
            character:
                characterDashboard
                    ?.character
                || character,
            phone,
            otherPhone,
            otherCharacter:
                otherDashboard
                    ?.character
                || otherCharacter
        };

    }

    getContactName(
        otherCharacter
    ) {

        return (
            otherCharacter.display_name
            || otherCharacter.proxy_name
            ||
            otherCharacter.name
            ||
            "Correspondant"
        );

    }

    async execute(
        interaction
    ) {

        try {

            const [
                ,
                callId,
                characterId
            ] =
                interaction.customId
                    .split(":");

            const call =
                PhoneV2Manager
                    .getCallById(
                        Number(
                            callId
                        )
                    );

            if (!call) {

                throw new Error(
                    "Appel introuvable."
                );

            }

            if (
                call.status !==
                "accepted"
            ) {

                throw new Error(
                    "Cet appel n’est plus connecté."
                );

            }

            const session =
                PhoneCallSessionManager
                    .get(
                        call.id
                    );

            if (!session) {

                throw new Error(
                    "La session de cet appel a expiré."
                );

            }

            if (
                !session.channelId
                ||
                !session.guildId
            ) {

                throw new Error(
                    "Le salon RP de cet appel est introuvable."
                );

            }

            const {
    character,
    phone,
    otherCharacter
} =
    this.getParticipantContext(
        interaction,
        call,
        characterId
    );

            const content =
                interaction.fields
                    .getTextInputValue(
                        "content"
                    );

            const contactName =
                this.getContactName(
                    otherCharacter
                );

            /*
             * Discord exige une réponse à la modal.
             * On crée donc une réponse éphémère temporaire,
             * puis on la supprime après la publication.
             */
            await interaction.deferReply(
                privatePayload(
                    interaction,
                    {}
                )
            );

await PhoneCallServiceV2
    .sendSpeech({
                    client:
                        interaction.client,

                    guildId:
                        session.guildId,

                    channelId:
                        session.channelId,

                    callId:
                        call.id,

                    character,

                    otherCharacter,

                    contactName,

                    content,

                    onChannelReady: () => {
                        PhoneCallV2Manager
                            .createMessage({
                                callId:
                                    call.id,

                                speakerPhoneId:
                                    phone.id,

                                content
                            });
                    }
                });

            /*
             * Suppression du message :
             * "Les paroles ont été publiées..."
             */
            await interaction
                .deleteReply()
                .catch(
                    () => null
                );

            return;

        } catch (error) {

            logger.error(
                "❌ Erreur parole appel V2 :",
                error
            );

            return editOrReplyError(
                interaction,
                error.message
                || "Impossible de publier les paroles."
            );

        }

    }

}

module.exports =
    new PhoneCallSpeakV2();
