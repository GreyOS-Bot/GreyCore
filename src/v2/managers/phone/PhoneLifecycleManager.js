const repository =
    require("./PhoneRepository");

function generatePhoneNumber() {
    for (
        let attempt = 0;
        attempt < 100;
        attempt++
    ) {
        const suffix =
            Math.floor(
                1000
                + Math.random() * 9000
            );

        const phoneNumber =
            `555-${suffix}`;

        const existing =
            repository.getPhoneByNumber(
                phoneNumber
            );

        if (!existing) {
            return phoneNumber;
        }
    }

    throw new Error(
        "Impossible de générer un numéro de téléphone unique."
    );
}

function createPhone(
    data
) {
    const existing =
        repository
            .getPhoneByContinuity(
                data.continuityId
            );

    if (existing) {
        return existing;
    }

    const phoneNumber =
        data.phoneNumber
        || generatePhoneNumber();

    const numberOwner =
        repository.getPhoneByNumber(
            phoneNumber
        );

    if (numberOwner) {
        throw new Error(
            "Ce numéro de téléphone est déjà utilisé."
        );
    }

    const now =
        new Date().toISOString();

    const phoneId =
        repository.insertPhone({
            continuityId:
                data.continuityId,
            phoneNumber,
            isActive:
                data.isActive === false
                    ? 0
                    : 1,
            createdAt:
                data.createdAt
                || now,
            updatedAt:
                data.updatedAt
                || now
        });

    return repository.getPhoneById(
        phoneId
    );
}

function setActive(
    phoneId,
    isActive
) {
    repository.setActive(
        phoneId,
        isActive ? 1 : 0,
        new Date().toISOString()
    );

    return repository.getPhoneById(
        phoneId
    );
}

module.exports = {
    generatePhoneNumber,
    createPhone,
    setActive
};
