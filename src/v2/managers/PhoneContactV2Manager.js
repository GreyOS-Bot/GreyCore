const reader =
    require(
        "./phoneContact/PhoneContactReader"
    );

const creationManager =
    require(
        "./phoneContact/PhoneContactCreationManager"
    );

const settingsManager =
    require(
        "./phoneContact/PhoneContactSettingsManager"
    );

class PhoneContactV2Manager {

    getById(
        contactId
    ) {
        return reader.getById(
            contactId
        );
    }

    getForPhone(
        phoneId
    ) {
        return reader.getForPhone(
            phoneId
        );
    }

    getFavoriteForPhone(
        phoneId
    ) {
        return reader
            .getFavoriteForPhone(
                phoneId
            );
    }

    getBlockedForPhone(
        phoneId
    ) {
        return reader
            .getBlockedForPhone(
                phoneId
            );
    }

    getByLinkedPhone(
        ownerPhoneId,
        linkedPhoneId
    ) {
        return reader
            .getByLinkedPhone(
                ownerPhoneId,
                linkedPhoneId
            );
    }

    getExternal(
        ownerPhoneId,
        displayName,
        phoneNumber = null
    ) {
        return reader.getExternal(
            ownerPhoneId,
            displayName,
            phoneNumber
        );
    }

    createGreycoreContact(
        ownerPhoneId,
        linkedPhoneId,
        options = {}
    ) {
        return creationManager
            .createGreycoreContact(
                ownerPhoneId,
                linkedPhoneId,
                options
            );
    }

    createExternalContact(
        ownerPhoneId,
        data
    ) {
        return creationManager
            .createExternalContact(
                ownerPhoneId,
                data
            );
    }

    ensureGreycoreContact(
        ownerPhoneId,
        linkedPhoneId
    ) {
        return creationManager
            .ensureGreycoreContact(
                ownerPhoneId,
                linkedPhoneId
            );
    }

    ensureMutualGreycoreContacts(
        phoneAId,
        phoneBId
    ) {
        return creationManager
            .ensureMutualGreycoreContacts(
                phoneAId,
                phoneBId
            );
    }

    update(
        contactId,
        data
    ) {
        return settingsManager.update(
            contactId,
            data
        );
    }

    setFavorite(
        contactId,
        isFavorite
    ) {
        return settingsManager
            .setFavorite(
                contactId,
                isFavorite
            );
    }

    setPinned(
        contactId,
        isPinned
    ) {
        return settingsManager
            .setPinned(
                contactId,
                isPinned
            );
    }

    setBlocked(
        contactId,
        isBlocked
    ) {
        return settingsManager
            .setBlocked(
                contactId,
                isBlocked
            );
    }

    registerInteraction(
        contactId,
        occurredAt = null
    ) {
        return settingsManager
            .registerInteraction(
                contactId,
                occurredAt
            );
    }

    search(
        ownerPhoneId,
        query,
        limit = 10
    ) {
        return reader.search(
            ownerPhoneId,
            query,
            limit
        );
    }

    delete(
        contactId
    ) {
        return settingsManager.delete(
            contactId
        );
    }

    getPhoneById(
        phoneId
    ) {
        return reader.getPhoneById(
            phoneId
        );
    }

    getPhoneDetails(
        phoneId
    ) {
        return reader.getPhoneDetails(
            phoneId
        );
    }
}

module.exports =
    new PhoneContactV2Manager();
