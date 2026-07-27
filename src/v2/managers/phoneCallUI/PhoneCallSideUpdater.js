const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "PhoneCallSideUpdater"
    );

const characterPhoneCallPage =
    require(
        "../../pages/character/CharacterPhoneCallPage"
    );

const participantResolver =
    require(
        "./PhoneCallParticipantResolver"
    );

async function refreshSide({
    target,
    targetType,
    call,
    phoneId,
    otherPhoneId,
    side
}) {
    if (!target) {
        logger.warn(
            `[PhoneCallUIManager] Interface ${side} absente pour l’appel ${call.id}.`
        );

        return;
    }

    const {
        phone,
        continuity,
        character
    } = participantResolver.resolve(
        phoneId
    );

    if (!phone) {
        logger.warn(
            `[PhoneCallUIManager] Téléphone ${phoneId} introuvable pour l’appel ${call.id}.`
        );

        return;
    }

    if (!continuity) {
        logger.warn(
            `[PhoneCallUIManager] Continuité introuvable pour le téléphone ${phone.id}.`
        );

        return;
    }

    if (!character) {
        logger.warn(
            `[PhoneCallUIManager] Personnage ${continuity.character_id} introuvable.`
        );

        return;
    }

    const payload =
        characterPhoneCallPage
            .build({
                character,
                phone,
                call,
                contactName:
                    participantResolver
                        .getContactName(
                            otherPhoneId
                        )
            });

    try {
        if (
            targetType ===
            "interaction"
        ) {
            if (
                typeof target.editReply !==
                "function"
            ) {
                throw new TypeError(
                    "L’interaction appelant ne possède pas editReply()."
                );
            }

            await target.editReply(
                payload
            );

            return;
        }

        if (
            targetType ===
            "message"
        ) {
            if (
                typeof target.edit !==
                "function"
            ) {
                throw new TypeError(
                    "Le message destinataire ne possède pas edit()."
                );
            }

            await target.edit(
                payload
            );

            return;
        }

        throw new TypeError(
            `Type de cible inconnu : ${targetType}.`
        );
    } catch (error) {
        logger.error(
            `[PhoneCallUIManager] Impossible d’actualiser l’interface ${side} de l’appel ${call.id} :`,
            error
        );

        throw error;
    }
}

module.exports = {
    refreshSide
};
