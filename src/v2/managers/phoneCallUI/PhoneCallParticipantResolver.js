const phoneManager =
    require("../PhoneV2Manager");

const characterManager =
    require("../CharacterV2Manager");

function resolve(
    phoneId
) {
    const phone =
        phoneManager.getPhoneById(
            phoneId
        );

    if (!phone) {
        return {
            phone:
                null,
            continuity:
                null,
            character:
                null
        };
    }

    const continuity =
        phoneManager
            .getContinuityByPhone(
                phone.id
            );

    if (!continuity) {
        return {
            phone,
            continuity:
                null,
            character:
                null
        };
    }

    const character =
        characterManager.getById(
            continuity.character_id
        );

    return {
        phone,
        continuity,
        character:
            character || null
    };
}

function getContactName(
    phoneId
) {
    const {
        character
    } = resolve(
        phoneId
    );

    if (!character) {
        return "Correspondant";
    }

    return (
        character.proxy_name
        || character.name
        || "Correspondant"
    );
}

module.exports = {
    resolve,
    getContactName
};
