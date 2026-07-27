const repository =
    require(
        "../../repositories/PhoneSearchRepository"
    );

const phoneContactManager =
    require("../PhoneContactV2Manager");

const {
    calculateBestMatchScore
} = require("./PhoneSearchUtils");

function search({
    viewerPhoneId,
    guildId,
    query,
    excludedPhoneIds
}) {
    const rows =
        query
            ? repository
                .searchGreycore({
                viewerPhoneId,
                guildId,
                query
            })
            : repository
                .listGreycore({
                viewerPhoneId,
                guildId
            });

    const results = [];

    for (const row of rows) {
        const phoneId =
            Number(row.phone_id);

        if (
            excludedPhoneIds.has(
                phoneId
            )
        ) {
            continue;
        }

        const existingContact =
            phoneContactManager
                .getByLinkedPhone(
                    viewerPhoneId,
                    phoneId
                );

        if (existingContact) {
            continue;
        }

        const title =
            row.character_name
            || row.phone_number
            || "Personnage Greycore";

        const matchScore =
            calculateBestMatchScore(
                query,
                [
                    title,
                    row.phone_number
                ]
            );

        if (
            query
            && matchScore <= 0
        ) {
            continue;
        }

        results.push({
            type:
                "greycore",
            score:
                matchScore
                + (
                    query
                        ? 10
                        : 5
                ),
            title,
            subtitle:
                row.phone_number
                || "Personnage Greycore",
            avatar:
                row.character_avatar_url
                || null,
            phoneId,
            contactId:
                null,
            conversationId:
                null,
            characterId:
                row.character_id
                    ? Number(
                        row.character_id
                    )
                    : null,
            continuityId:
                row.continuity_id
                    ? Number(
                        row.continuity_id
                    )
                    : null,
            phoneNumber:
                row.phone_number
                || null,
            contactType:
                "greycore",
            favorite:
                false,
            pinned:
                false,
            blocked:
                false,
            external:
                false,
            group:
                false,
            source:
                "greycore",
            lastInteractionAt:
                null
        });
    }

    return results;
}

module.exports = {
    search
};
