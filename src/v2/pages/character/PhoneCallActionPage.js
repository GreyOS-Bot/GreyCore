const PhoneV2Manager =
    require("../../managers/PhoneV2Manager");

const CharacterV2Manager =
    require("../../managers/CharacterV2Manager");

const PhoneCallUIManager =
    require("../../managers/PhoneCallUIManager");

const PhoneCallSessionManager =
    require("../../managers/PhoneCallSessionManager");

const CharacterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const PhoneCallServiceV2 =
    require(
        "../../services/phone/PhoneCallService"
    );

const {
    updateError
} = require(
    "../../core/services/InteractionResponseService"
);

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "PhoneCallActionPage"
    );

const {
    toPublicErrorMessage,
    PHONE_CALL_MESSAGES
} = require(
    "../../core/services/PublicErrorMessageService"
);

class PhoneCallActionPage {

    registerReceiverMessage(
        interaction,
        callId
    ) {
        if (!interaction.message) {
            return;
        }

        PhoneCallSessionManager.register(
            callId,
            {
                receiverMessage:
                    interaction.message
            }
        );
    }

    getCharacterContext(
        interaction,
        characterId,
        preferredPhoneIds = []
    ) {

        let dashboardData =
    CharacterDashboardManager
        .getPlayableDashboardData(
            characterId,
            {
                guildId:
                    interaction.guildId
                    || null
            }
        );

if (!dashboardData) {

    dashboardData =
        CharacterDashboardManager
            .getPlayableDashboardData(
                characterId,
                {
                    guildId: null
                }
            );

}

        const character =
            dashboardData?.character
            || CharacterV2Manager.getById(
                characterId
            );

        if (
            !character
            || String(character.discord_user_id)
            !==
            String(
                interaction.user.id
            )
        ) {

            throw new Error(
                "Vous ne pouvez pas utiliser le téléphone de ce personnage."
            );

        }

        if (dashboardData?.continuity) {
            const phone =
                PhoneV2Manager
                    .getPhoneByContinuity(
                        dashboardData.continuity.id
                    );

            if (phone) {
                return {
                    character,
                    continuity:
                        dashboardData.continuity,
                    phone
                };
            }
        }

        /*
         * Les boutons reçus en message privé ne possèdent
         * pas de guildId. L’appel indique toutefois quel
         * téléphone doit être utilisé : on retrouve alors
         * sa continuité sans dépendre du serveur courant.
         */
        for (
            const phoneId
            of preferredPhoneIds
        ) {
            const phone =
                PhoneV2Manager.getPhoneById(
                    phoneId
                );

            const continuity =
                PhoneV2Manager
                    .getContinuityByPhone(
                        phoneId
                    );

            if (
                phone
                && continuity
                && String(continuity.character_id) ===
                    String(character.id)
            ) {
                return {
                    character,
                    continuity,
                    phone
                };
            }
        }

        throw new Error(
            "Personnage ou continuité introuvable."
        );

    }

    async accept(
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

                throw new Error(
                    "Appel introuvable."
                );

            }

            const {
                phone
            } =
                this.getCharacterContext(
                    interaction,
                    characterId,
                    [call.receiver_phone_id]
                );

            if (
                Number(
                    call.receiver_phone_id
                )
                !==
                Number(
                    phone.id
                )
            ) {

                throw new Error(
                    "Seul le destinataire peut décrocher."
                );

            }

            if (
                call.status !==
                "ringing"
            ) {

                throw new Error(
                    "Cet appel n’est plus en attente."
                );

            }

            this.registerReceiverMessage(
                interaction,
                call.id
            );

            await interaction
                .deferUpdate();

            const acceptedCall =
                PhoneV2Manager
                    .acceptCall(
                        call.id
                    );

            await PhoneCallUIManager
                .refresh(
                    acceptedCall.id
                );

            return acceptedCall;

        } catch (error) {

            logger.error(
                "❌ Erreur acceptation appel V2 :",
                error
            );

            return updateError(
                interaction,
                toPublicErrorMessage(
                    error,
                    "Impossible de décrocher.",
                    PHONE_CALL_MESSAGES
                )
            );

        }

    }

    async refuse(
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

                throw new Error(
                    "Appel introuvable."
                );

            }

            const {
                phone
            } =
                this.getCharacterContext(
                    interaction,
                    characterId,
                    [call.receiver_phone_id]
                );

            if (
                Number(
                    call.receiver_phone_id
                )
                !==
                Number(
                    phone.id
                )
            ) {

                throw new Error(
                    "Seul le destinataire peut refuser cet appel."
                );

            }

            if (
                call.status !==
                "ringing"
            ) {

                throw new Error(
                    "Cet appel n’est plus en attente."
                );

            }

            this.registerReceiverMessage(
                interaction,
                call.id
            );

            await interaction
                .deferUpdate();

            const refusedCall =
                PhoneV2Manager
                    .refuseCall(
                        call.id
                    );

            await PhoneCallUIManager
                .refresh(
                    refusedCall.id
                );

            return refusedCall;

        } catch (error) {

            logger.error(
                "❌ Erreur refus appel V2 :",
                error
            );

            return updateError(
                interaction,
                toPublicErrorMessage(
                    error,
                    "Impossible de refuser l’appel.",
                    PHONE_CALL_MESSAGES
                )
            );

        }

    }

    async end(
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

                throw new Error(
                    "Appel introuvable."
                );

            }

            const {
                phone
            } =
                this.getCharacterContext(
                    interaction,
                    characterId,
                    [
                        call.caller_phone_id,
                        call.receiver_phone_id
                    ]
                );

            const isParticipant =
                Number(
                    call.caller_phone_id
                )
                ===
                Number(
                    phone.id
                )
                ||
                Number(
                    call.receiver_phone_id
                )
                ===
                Number(
                    phone.id
                );

            if (!isParticipant) {

                throw new Error(
                    "Ce téléphone ne participe pas à cet appel."
                );

            }

            if (
                call.status !==
                "ringing"
                &&
                call.status !==
                "accepted"
            ) {

                await interaction.deferUpdate();

                await PhoneCallUIManager
                    .refresh(call.id);

                return call;

            }

            const wasAccepted =
                call.status ===
                "accepted";

            await interaction
                .deferUpdate();

            const endedCall =
                wasAccepted

                    ? PhoneV2Manager
                        .endCall(
                            call.id
                        )

                    : PhoneV2Manager
                        .cancelCall(
                            call.id
                        );

            /*
             * Le salon RP est nettoyé avant refresh(),
             * car PhoneCallUIManager peut supprimer
             * la session une fois l’appel terminé.
             */
            if (wasAccepted) {

                await PhoneCallServiceV2
                    .finalizeCall({
                        client:
                            interaction.client,

                        callId:
                            endedCall.id
                    })
                    .catch(error => {

                        logger.error(
                            "❌ Finalisation du salon d’appel impossible :",
                            error
                        );

                    });

            }

            await PhoneCallUIManager
                .refresh(
                    endedCall.id
                );

            return endedCall;

        } catch (error) {

            logger.error(
                "❌ Erreur fin appel V2 :",
                error
            );

            return updateError(
                interaction,
                toPublicErrorMessage(
                    error,
                    "Impossible de raccrocher.",
                    PHONE_CALL_MESSAGES
                )
            );

        }

    }

}

module.exports =
    new PhoneCallActionPage();
