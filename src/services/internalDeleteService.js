const internallyDeletedMessages = new Set();

function markInternalDelete(messageId) {
    internallyDeletedMessages.add(messageId);

    // Sécurité : on retire automatiquement l’ID après 30 secondes.
    setTimeout(() => {
        internallyDeletedMessages.delete(messageId);
    }, 30_000);
}

function consumeInternalDelete(messageId) {
    if (!internallyDeletedMessages.has(messageId)) {
        return false;
    }

    internallyDeletedMessages.delete(messageId);
    return true;
}

module.exports = {
    markInternalDelete,
    consumeInternalDelete
};