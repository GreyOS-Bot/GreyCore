function toPublicErrorMessage(
    error,
    fallback,
    allowedMessages = []
) {
    const message = error instanceof Error
        ? error.message
        : null;

    return message && allowedMessages.includes(message)
        ? message
        : fallback;
}

const PHONE_CALL_MESSAGES = [
    "Les identifiants des téléphones sont invalides.",
    "Un téléphone ne peut pas s'appeler lui-même.",
    "Téléphone appelant introuvable.",
    "Téléphone destinataire introuvable.",
    "Le téléphone appelant est désactivé.",
    "Le téléphone destinataire est désactivé.",
    "Le téléphone appelant est déjà en communication.",
    "Le téléphone destinataire est déjà en communication.",
    "Vous ne pouvez pas utiliser le téléphone de ce personnage.",
    "Personnage ou continuité introuvable.",
    "Appel introuvable.",
    "Seul le destinataire peut décrocher.",
    "Seul le destinataire peut refuser cet appel.",
    "Cet appel n’est plus en attente.",
    "Ce téléphone ne participe pas à cet appel.",
    "Personnage introuvable.",
    "Vous ne pouvez pas parler avec ce personnage.",
    "Les téléphones de cet appel sont introuvables.",
    "Ce personnage ne participe pas à cet appel.",
    "La continuité du correspondant est introuvable.",
    "Le correspondant est introuvable.",
    "Cet appel n’est plus connecté.",
    "La session de cet appel a expiré.",
    "La session de cet appel est introuvable.",
    "Le salon RP de cet appel est introuvable.",
    "Le salon RP ne correspond pas au serveur de l’appel.",
    "Le message ne peut pas être vide.",
    "Le personnage qui parle est introuvable.",
    "Ce thread est verrouillé. Un membre du staff doit le rouvrir avant de pouvoir continuer ici.",
    "GreyCore n’a pas les permissions nécessaires pour utiliser ce thread.",
    "GreyCore n’a plus accès à ce thread.",
    "Ce thread est introuvable sur Discord.",
    "Ce type de salon ne permet pas cette opération.",
    "Ce thread est archivé et GreyCore n’a pas pu le rouvrir."
];

const GREYFATE_MESSAGES = [
    "Cette scène ne peut plus être prolongée.",
    "Cette proposition de prolongation n’est plus active."
];

const MMS_MESSAGES = [
    "Le MMS n’a pas été conservé car le message original n’a pas pu être supprimé."
];

module.exports = {
    toPublicErrorMessage,
    PHONE_CALL_MESSAGES,
    GREYFATE_MESSAGES,
    MMS_MESSAGES
};
