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
        if (Number(contactId) >= 1000000000) return require("../repositories/InstallationPhoneRuntimeRepository").getContact(contactId);
        return reader.getById(
            contactId
        );
    }

    getForPhone(
        phoneId
    ) {
        if (Number(phoneId) >= 1000000000) return require("../repositories/InstallationPhoneRuntimeRepository").getContacts(phoneId);
        return reader.getForPhone(
            phoneId
        );
    }

    getFavoriteForPhone(
        phoneId
    ) {
        if (Number(phoneId) >= 1000000000) return this.getForPhone(phoneId).filter(contact => contact.favorite);
        return reader
            .getFavoriteForPhone(
                phoneId
            );
    }

    getBlockedForPhone(
        phoneId
    ) {
        if (Number(phoneId) >= 1000000000) return this.getForPhone(phoneId).filter(contact => contact.blocked);
        return reader
            .getBlockedForPhone(
                phoneId
            );
    }

    getByLinkedPhone(
        ownerPhoneId,
        linkedPhoneId
    ) {
        if (Number(ownerPhoneId) >= 1000000000) return require("../repositories/InstallationPhoneRuntimeRepository").getContactByLinkedPhone(ownerPhoneId, linkedPhoneId);
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
        if (Number(ownerPhoneId) >= 1000000000) return require("../repositories/InstallationPhoneRuntimeRepository").getExternalContact(ownerPhoneId, displayName, phoneNumber);
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
        if (Number(ownerPhoneId) >= 1000000000) {
            const owner = require("./InstallationPhoneV2Manager").getById(ownerPhoneId);
            const linked = require("./InstallationPhoneV2Manager").getById(linkedPhoneId);
            return require("../services/phone/InstallationPhoneRuntimeService").addContact({
                guildId: owner.guild_id, contextId: owner.context_id, phoneId: ownerPhoneId,
                linkedPhoneId, displayName: options.displayName || linked?.phone_number || "Contact", ...options
            });
        }
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
        if (Number(ownerPhoneId) >= 1000000000) {
            const owner = require("./InstallationPhoneV2Manager").getById(ownerPhoneId);
            return require("../services/phone/InstallationPhoneRuntimeService").addContact({
                guildId: owner.guild_id, contextId: owner.context_id, phoneId: ownerPhoneId, ...data
            });
        }
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
        if (Number(ownerPhoneId) >= 1000000000) return this.getByLinkedPhone(ownerPhoneId, linkedPhoneId) || this.createGreycoreContact(ownerPhoneId, linkedPhoneId);
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
        if (Number(phoneAId) >= 1000000000 || Number(phoneBId) >= 1000000000) return {
            phoneAContact: this.ensureGreycoreContact(phoneAId, phoneBId),
            phoneBContact: this.ensureGreycoreContact(phoneBId, phoneAId)
        };
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
        if (Number(contactId) >= 1000000000) return require("../repositories/InstallationPhoneRuntimeRepository").updateContact(contactId, data, new Date().toISOString());
        return settingsManager.update(
            contactId,
            data
        );
    }

    setFavorite(
        contactId,
        isFavorite
    ) {
        if (Number(contactId) >= 1000000000) return this.update(contactId, { favorite: isFavorite });
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
        if (Number(contactId) >= 1000000000) return this.update(contactId, { pinned: isPinned });
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
        if (Number(contactId) >= 1000000000) return this.update(contactId, { blocked: isBlocked });
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
        if (Number(contactId) >= 1000000000) return require("../repositories/InstallationPhoneRuntimeRepository")
            .registerContactInteraction(contactId, occurredAt || new Date().toISOString());
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
        if (Number(ownerPhoneId) >= 1000000000) {
            const value = String(query || "").toLowerCase();
            return this.getForPhone(ownerPhoneId).filter(contact => contact.display_name.toLowerCase().includes(value) || String(contact.phone_number || "").includes(value)).slice(0, limit);
        }
        return reader.search(
            ownerPhoneId,
            query,
            limit
        );
    }

    delete(
        contactId
    ) {
        if (Number(contactId) >= 1000000000) return require("../repositories/InstallationPhoneRuntimeRepository").deleteContact(contactId);
        return settingsManager.delete(
            contactId
        );
    }

    getPhoneById(
        phoneId
    ) {
        if (Number(phoneId) >= 1000000000) return require("./InstallationPhoneV2Manager").getById(phoneId);
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
