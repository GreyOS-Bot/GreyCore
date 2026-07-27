const repository =
    require(
        "./PhoneContactRepository"
    );

function update(
    contactId,
    data
) {
    const contact =
        repository.getById(
            contactId
        );

    if (!contact) {
        throw new Error(
            "Contact introuvable."
        );
    }

    const displayName =
        data.displayName ===
        undefined
            ? contact.display_name
            : data.displayName?.trim();

    if (!displayName) {
        throw new Error(
            "Le nom du contact est obligatoire."
        );
    }

    repository.updateContact({
        contactId,
        displayName,
        phoneNumber:
            data.phoneNumber ===
            undefined
                ? contact.phone_number
                : data.phoneNumber?.trim()
                    || null,
        favorite:
            data.favorite ===
            undefined
                ? contact.favorite
                : data.favorite
                    ? 1
                    : 0,
        pinned:
            data.pinned ===
            undefined
                ? contact.pinned
                : data.pinned
                    ? 1
                    : 0,
        blocked:
            data.blocked ===
            undefined
                ? contact.blocked
                : data.blocked
                    ? 1
                    : 0,
        notes:
            data.notes ===
            undefined
                ? contact.notes
                : data.notes?.trim()
                    || null,
        updatedAt:
            new Date().toISOString()
    });

    return repository.getById(
        contactId
    );
}

function setFavorite(
    contactId,
    isFavorite
) {
    return update(
        contactId,
        {
            favorite:
                isFavorite
        }
    );
}

function setPinned(
    contactId,
    isPinned
) {
    return update(
        contactId,
        {
            pinned:
                isPinned
        }
    );
}

function setBlocked(
    contactId,
    isBlocked
) {
    return update(
        contactId,
        {
            blocked:
                isBlocked
        }
    );
}

function registerInteraction(
    contactId,
    occurredAt = null
) {
    const contact =
        repository.getById(
            contactId
        );

    if (!contact) {
        throw new Error(
            "Contact introuvable."
        );
    }

    const now =
        occurredAt
        || new Date().toISOString();

    repository.registerInteraction(
        contactId,
        now
    );

    return repository.getById(
        contactId
    );
}

function deleteContact(
    contactId
) {
    const contact =
        repository.getById(
            contactId
        );

    if (!contact) {
        throw new Error(
            "Contact introuvable."
        );
    }

    repository.deleteById(
        contactId
    );

    return contact;
}

module.exports = {
    update,
    setFavorite,
    setPinned,
    setBlocked,
    registerInteraction,
    delete:
        deleteContact
};
