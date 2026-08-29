const {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const PhoneV2Manager =
    require(
        "../managers/PhoneV2Manager"
    );

const CharacterV2Manager =
    require(
        "../managers/CharacterV2Manager"
    );

const {
    editOrReplyError
} = require(
    "../core/services/InteractionResponseService"
);

const logger =
    require(
        "../core/services/TechnicalLogger"
    ).create(
        "PhoneCallSpeakModal"
    );

const {
    toPublicErrorMessage,
    PHONE_CALL_MESSAGES
} = require(
    "../core/services/PublicErrorMessageService"
);

class PhoneCallSpeakModal {

    characterParticipatesInCall(
        characterId,
        call
    ) {

        const callerContinuity =
            PhoneV2Manager
                .getContinuityByPhone(
                    call.caller_phone_id
                );

        const receiverContinuity =
            PhoneV2Manager
                .getContinuityByPhone(
                    call.receiver_phone_id
                );

        return (

            String(
                callerContinuity
                    ?.character_id
            ) ===
            String(
                characterId
            )

            ||

            String(
                receiverContinuity
                    ?.character_id
            ) ===
            String(
                characterId
            )

        );

    }

    async show(
        interaction,
        callId,
        characterId
    ) {

        try {

            const call =
                PhoneV2Manager
                    .getCallById(
                        callId
                    );

            if (!call) {

                return editOrReplyError(
                    interaction,
                    "Appel introuvable."
                );

            }

            if (
                call.status !==
                "accepted"
            ) {

                return editOrReplyError(
                    interaction,
                    "Cet appel n’est plus connecté."
                );

            }

            const character =
                CharacterV2Manager
                    .getById(
                        characterId
                    );

            if (!character) {

                return editOrReplyError(
                    interaction,
                    "Personnage introuvable."
                );

            }

            /*
             * Sécurité principale :
             * seul le propriétaire du personnage
             * indiqué dans le bouton peut parler.
             */
            if (
                String(
                    character.discord_user_id
                )
                !==
                String(
                    interaction.user.id
                )
            ) {

                return editOrReplyError(
                    interaction,
                    "Ce bouton ne correspond pas à votre personnage."
                );

            }

            if (
                !this.characterParticipatesInCall(
                    character.id,
                    call
                )
            ) {

                return editOrReplyError(
                    interaction,
                    "Ce personnage ne participe pas à cet appel."
                );

            }

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        `v2_phone_call_speak_modal:${call.id}:${character.id}`
                    )
                    .setTitle(
                        "Parler pendant l’appel"
                    );

            const contentInput =
                new TextInputBuilder()
                    .setCustomId(
                        "content"
                    )
                    .setLabel(
                        "Que dit votre personnage ?"
                    )
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setRequired(
                        true
                    )
                    .setMaxLength(
                        1900
                    )
                    .setPlaceholder(
                        "Écrivez ici les paroles de votre personnage..."
                    );

            modal.addComponents(

                new ActionRowBuilder()
                    .addComponents(
                        contentInput
                    )

            );

            return interaction.showModal(
                modal
            );

        } catch (error) {

            logger.error(
                "❌ Erreur ouverture modal d’appel :",
                error
            );

            return editOrReplyError(
                interaction,
                toPublicErrorMessage(
                    error,
                    "Impossible d’ouvrir la réponse.",
                    PHONE_CALL_MESSAGES
                )
            );

        }

    }

}

module.exports =
    new PhoneCallSpeakModal();
