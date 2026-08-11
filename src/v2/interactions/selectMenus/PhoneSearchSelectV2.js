const CharacterV2Manager =
    require(
        "../../managers/CharacterV2Manager"
    );

const PhoneV2Manager =
    require(
        "../../managers/PhoneV2Manager"
    );

const CharacterPhoneConversationsPage =
    require(
        "../../pages/character/CharacterPhoneConversationsPage"
    );

const PhoneCallStartPage =
    require(
        "../../pages/character/PhoneCallStartPage"
    );

const PhoneGroupCreationPage =
    require(
        "../../pages/character/PhoneGroupCreationPage"
    );

const groupDraftService =
    require(
        "../../services/phone/PhoneGroupDraftService"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function PhoneSearchSelectV2(
        interaction
    ) {
        const [
            ,
            characterId,
            senderPhoneIdValue,
            modeValue
        ] = interaction.customId.split(":");

        const senderPhoneId =
            Number(
                senderPhoneIdValue
            );

        const mode =
            [
                "call",
                "group",
                "email"
            ].includes(modeValue)
                ? modeValue
                : "sms";

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

        const senderPhone =
            PhoneV2Manager.getPhoneById(
                senderPhoneId
            );

        if (!senderPhone) {
            return replyError(
                interaction,
                "Téléphone expéditeur introuvable."
            );
        }

        const senderContinuity =
            PhoneV2Manager
                .getContinuityByPhone(
                    senderPhone.id
                );

        if (
            !senderContinuity
            ||
            String(
                senderContinuity
                    .character_id
            )
            !==
            String(
                character.id
            )
        ) {
            return replyError(
                interaction,
                "Ce téléphone ne correspond pas à ce personnage."
            );
        }

        const selectedValue =
            interaction.values[0];

        const [
            resultType,
            resultIdValue
        ] = selectedValue.split(":");

        const resultId =
            Number(
                resultIdValue
            );

        if (
            !resultId
            ||
            ![
                "phone",
                "conversation"
            ].includes(
                resultType
            )
        ) {
            return replyError(
                interaction,
                "Résultat de recherche invalide."
            );
        }

        let conversation = null;

        if (
            resultType ===
            "phone"
        ) {
            const recipientPhone =
                PhoneV2Manager.getPhoneById(
                    resultId
                );

            if (!recipientPhone) {
                return replyError(
                    interaction,
                    "Téléphone destinataire introuvable."
                );
            }

            if (
                Number(
                    recipientPhone.id
                )
                ===
                Number(
                    senderPhone.id
                )
            ) {
                return replyError(
                    interaction,
                    mode === "call"
                        ? "Vous ne pouvez pas vous appeler vous-même."
                        : mode === "group"
                            ? "Vous ne pouvez pas vous ajouter vous-même au groupe."
                            : "Vous ne pouvez pas vous envoyer un SMS à vous-même."
                );
            }

            if (mode === "group") {
                try {
                    groupDraftService.addMember({
                        userId:
                            interaction.user.id,
                        characterId,
                        ownerPhoneId:
                            senderPhone.id,
                        phoneId:
                            recipientPhone.id
                    });
                } catch (error) {
                    return replyError(
                        interaction,
                        error.message
                    );
                }

                return PhoneGroupCreationPage.render(
                    interaction,
                    characterId
                );
            }

            conversation =
                PhoneV2Manager
                    .getOrCreateConversation(
                        senderPhone.id,
                        recipientPhone.id
                    );
        } else {
            conversation =
                PhoneV2Manager
                    .getConversationById(
                        resultId
                    );

            if (!conversation) {
                return replyError(
                    interaction,
                    "Conversation introuvable."
                );
            }

            const isParticipant =
                require(
                    "../../managers/PhoneConversationV2Manager"
                )
                    .isParticipant(
                        conversation.id,
                        senderPhone.id
                    );

            if (!isParticipant) {
                return replyError(
                    interaction,
                    "Ce téléphone n’appartient pas à cette conversation."
                );
            }
        }

        if (
            mode === "call"
        ) {
            return PhoneCallStartPage.execute(
                interaction,
                conversation.id,
                characterId
            );
        }

        if (
            mode === "email"
        ) {
            const PhoneMessageModal =
                require(
                    "../../modals/PhoneMessageModal"
                );

            return PhoneMessageModal.show(
                interaction,
                conversation.id,
                characterId,
                {
                    source: "phone_home",
                    kind: "email"
                }
            );
        }

        return CharacterPhoneConversationsPage
            .execute(
                interaction,
                characterId
            );
    };
