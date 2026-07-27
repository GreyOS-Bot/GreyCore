const repository =
    require(
        "./PhoneContactRepository"
    );

const unitOfWork =
    require(
        "./PhoneContactUnitOfWork"
    );

function createGreycoreContact(
    ownerPhoneId,
    linkedPhoneId,
    options = {}
) {
    if (
        Number(ownerPhoneId) ===
        Number(linkedPhoneId)
    ) {
        throw new Error(
            "Un téléphone ne peut pas s’ajouter lui-même à ses contacts."
        );
    }

    const ownerPhone =
        repository.getPhoneById(
            ownerPhoneId
        );

    const linkedPhone =
        repository.getPhoneDetails(
            linkedPhoneId
        );

    if (
        !ownerPhone
        || !linkedPhone
    ) {
        throw new Error(
            "Téléphone introuvable."
        );
    }

    const existing =
        repository.getByLinkedPhone(
            ownerPhoneId,
            linkedPhoneId
        );

    const now =
        new Date().toISOString();

    const displayName =
        options.displayName?.trim()
        || linkedPhone.character_name
        || linkedPhone.phone_number;

    if (existing) {
        repository
            .updateGreycoreContact({
                contactId:
                    existing.id,
                displayName,
                phoneNumber:
                    linkedPhone
                        .phone_number,
                updatedAt:
                    now
            });

        return repository.getById(
            existing.id
        );
    }

    const contactId =
        repository
            .insertGreycoreContact({
                ownerPhoneId,
                linkedPhoneId,
                displayName,
                phoneNumber:
                    linkedPhone
                        .phone_number,
                favorite:
                    options.favorite
                        ? 1
                        : 0,
                pinned:
                    options.pinned
                        ? 1
                        : 0,
                blocked:
                    options.blocked
                        ? 1
                        : 0,
                createdAt:
                    now
            });

    return repository.getById(
        contactId
    );
}

function createExternalContact(
    ownerPhoneId,
    data
) {
    const ownerPhone =
        repository.getPhoneById(
            ownerPhoneId
        );

    if (!ownerPhone) {
        throw new Error(
            "Téléphone propriétaire introuvable."
        );
    }

    const displayName =
        data.displayName?.trim();

    const phoneNumber =
        data.phoneNumber?.trim()
        || null;

    if (!displayName) {
        throw new Error(
            "Le nom du contact est obligatoire."
        );
    }

    const allowedTypes = [
        "external",
        "plural",
        "tupperbox",
        "npc"
    ];

    const contactType =
        allowedTypes.includes(
            data.contactType
        )
            ? data.contactType
            : "external";

    const existing =
        repository.getExternal(
            ownerPhoneId,
            displayName,
            phoneNumber
        );

    const now =
        new Date().toISOString();

    const contactData = {
        contactType,
        favorite:
            data.favorite
                ? 1
                : 0,
        pinned:
            data.pinned
                ? 1
                : 0,
        blocked:
            data.blocked
                ? 1
                : 0,
        notes:
            data.notes?.trim()
            || null
    };

    if (existing) {
        repository
            .updateExternalContact({
                contactId:
                    existing.id,
                ...contactData,
                updatedAt:
                    now
            });

        return repository.getById(
            existing.id
        );
    }

    const contactId =
        repository
            .insertExternalContact({
                ownerPhoneId,
                displayName,
                phoneNumber,
                ...contactData,
                createdAt:
                    now
            });

    return repository.getById(
        contactId
    );
}

function ensureGreycoreContact(
    ownerPhoneId,
    linkedPhoneId
) {
    return createGreycoreContact(
        ownerPhoneId,
        linkedPhoneId
    );
}

function ensureMutualGreycoreContacts(
    phoneAId,
    phoneBId
) {
    return unitOfWork.run(
            () => {
                const contactA =
                    ensureGreycoreContact(
                        phoneAId,
                        phoneBId
                    );

                const contactB =
                    ensureGreycoreContact(
                        phoneBId,
                        phoneAId
                    );

                return {
                    contactA,
                    contactB
                };
            }
        );
}

module.exports = {
    createGreycoreContact,
    createExternalContact,
    ensureGreycoreContact,
    ensureMutualGreycoreContacts
};
