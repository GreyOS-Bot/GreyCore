const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "PhoneCallStartPage"
    );

const PhoneV2Manager =
    require("../../managers/PhoneV2Manager");

const PhoneConversationV2Manager =
    require(
        "../../managers/PhoneConversationV2Manager"
    );

const PhoneCallSessionManager =
    require(
        "../../managers/PhoneCallSessionManager"
    );

const PhoneCallUIManager =
    require(
        "../../managers/PhoneCallUIManager"
    );

const CharacterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const CharacterPhoneCallPage =
    require("./CharacterPhoneCallPage");

const PhoneNotificationService =
    require(
        "../../services/phone/PhoneNotificationService"
    );

const installationV2Manager =
    require(
        "../../managers/InstallationV2Manager"
    );

const installationAccessPolicy =
    require(
        "../../core/policies/InstallationAccessPolicy"
    );

class PhoneCallStartPage {

    errorPayload(
        message
    ) {

        return {
            content:
                `❌ ${message}`,
            embeds: [],
            components: []
        };

    }

    async sendError(
        interaction,
        message
    ) {

        const payload =
            this.errorPayload(
                message
            );

        if (
            interaction.deferred
            ||
            interaction.replied
        ) {

            return interaction.editReply(
                payload
            );

        }

        return interaction.update(
            payload
        );

    }

    async execute(
        interaction,
        conversationId,
        characterId
    ) {

        let call = null;

        try {

            const dashboardData =
                CharacterDashboardManager
                    .getPlayableDashboardData(
                        characterId,
                        {
                            guildId:
                                interaction.guildId
                                || null
                        }
                    );

            if (
                !dashboardData
                ||
                !dashboardData.character
                ||
                !dashboardData.continuity
            ) {

                return this.sendError(
                    interaction,
                    "Personnage ou continuité introuvable."
                );

            }

            const {
                character,
                continuity
            } = dashboardData;

            if (
                String(
                    character.discord_user_id
                )
                !==
                String(
                    interaction.user.id
                )
            ) {

                return this.sendError(
                    interaction,
                    "Vous ne pouvez pas utiliser le téléphone de ce personnage."
                );

            }

            const phone =
                PhoneV2Manager
                    .getPhoneByContinuity(
                        continuity.id
                    );

            if (!phone) {

                return this.sendError(
                    interaction,
                    "Aucun téléphone n’est configuré pour cette continuité."
                );

            }

            const conversation =
                PhoneV2Manager
                    .getConversationById(
                        conversationId
                    );

            if (!conversation) {

                return this.sendError(
                    interaction,
                    "Conversation introuvable."
                );

            }

            const isParticipant =
                PhoneConversationV2Manager
                    .isParticipant(
                        conversation.id,
                        phone.id
                    );

            if (!isParticipant) {

                return this.sendError(
                    interaction,
                    "Ce téléphone n’appartient pas à cette conversation."
                );

            }

            if (
                conversation.conversation_type
                !==
                "private"
            ) {

                return this.sendError(
                    interaction,
                    "Les appels de groupe ne sont pas encore disponibles."
                );

            }

            const existingCall =
                PhoneV2Manager
                    .getActiveCall(
                        phone.id
                    );

            if (existingCall) {

                return this.sendError(
                    interaction,
                    "Ce téléphone participe déjà à un appel actif."
                );

            }

            const receiver =
                PhoneConversationV2Manager
                    .getOtherParticipant(
                        conversation.id,
                        phone.id
                    );

            if (
                !receiver
                ||
                !receiver.phone_id
            ) {

                return this.sendError(
                    interaction,
                    "Le destinataire ne possède pas de téléphone Greycore compatible avec les appels."
                );

            }

            const receiverInstallation =
                installationV2Manager
                    .getByContinuityAndGuild(
                        receiver.continuity_id,
                        interaction.guildId
                    );

            if (
                !installationAccessPolicy
                    .isPlayable(
                        receiverInstallation
                    )
            ) {

                return this.sendError(
                    interaction,
                    "Le destinataire n’est pas encore validé et jouable sur ce serveur."
                );

            }

            const receiverActiveCall =
                PhoneV2Manager
                    .getActiveCall(
                        receiver.phone_id
                    );

            if (receiverActiveCall) {

                return this.sendError(
                    interaction,
                    "Le destinataire participe déjà à un autre appel."
                );

            }

            call =
                PhoneV2Manager
                    .createCall({
                        callerPhoneId:
                            phone.id,

                        receiverPhoneId:
                            receiver.phone_id
                    });

            const contactName =
                receiver.character_name
                ||
                receiver.external_name
                ||
                receiver.phone_number
                ||
                receiver.external_phone
                ||
                "Contact inconnu";

            /*
             * On affiche d’abord l’interface de l’appelant.
             * Cette interface est une réponse éphémère.
             */
            const response =
                await CharacterPhoneCallPage
                    .execute(
                        interaction,
                        {
                            character,
                            phone,
                            call,
                            contactName
                        }
                    );

            /*
             * Important :
             * on conserve l’interaction, pas fetchReply().
             *
             * Une réponse éphémère doit être actualisée
             * avec interaction.editReply().
             */
            PhoneCallSessionManager
    .register(
        call.id,
        {
            callerInteraction:
                interaction,

            guildId:
                interaction.guildId,

            channelId:
                interaction.channelId
        }
    );

            /*
             * Notification privée du destinataire.
             * PhoneNotificationService enregistrera
             * receiverMessage dans la même session.
             */
            await PhoneNotificationService
                .notifyIncomingCall({
                    client:
                        interaction.client,

                    call,

                    receiverParticipant:
                        receiver,

                    senderCharacter:
                        character
                })
                .catch(error => {

                    logger.error(
                        "❌ Notification d’appel impossible :",
                        error
                    );

                    return null;

                });

            /* const missedTimeout =
                setTimeout(
                    async () => {

                        try {

                            const currentCall =
                                PhoneV2Manager
                                    .getCallById(
                                        call.id
                                    );

                            if (
                                !currentCall
                                ||
                                currentCall.status
                                !==
                                "ringing"
                            ) {
                                return;
                            }

                            const missedCall =
                                PhoneV2Manager
                                    .markMissed(
                                        call.id
                                    );

                            await PhoneCallUIManager
                                .refresh(
                                    missedCall.id
                                );

                        } catch (error) {

                            logger.error(
                                "❌ Erreur appel manqué automatique V2 :",
                                error
                            );

                            PhoneCallSessionManager
                                .remove(
                                    call.id
                                );

                        }

                    },
                    30000
                );

            PhoneCallSessionManager
                .setTimeout(
                    call.id,
                    missedTimeout
                );
            */

            return response;

        } catch (error) {

            logger.error(
                "❌ Erreur création appel V2 :",
                error
            );

            if (call?.id) {

                PhoneCallSessionManager
                    .remove(
                        call.id
                    );

            }

            return this.sendError(
                interaction,
                error.message
                ||
                "Impossible de lancer cet appel."
            );

        }

    }

}

module.exports =
    new PhoneCallStartPage();
