const phoneContactManager =
    require("../PhoneContactV2Manager");

const {
    calculateBestMatchScore,
    calculateRecencyBonus,
    getContactTypeLabel
} = require("./PhoneSearchUtils");

function search({
    viewerPhoneId,
    query,
    includeExternal,
    includeFavorites,
    includeBlocked,
    excludedPhoneIds
}) {
    const contacts =
        phoneContactManager
            .getForPhone(
                viewerPhoneId
            );

    const results = [];

    for (const contact of contacts) {
        if (
            !includeBlocked
            && Number(contact.blocked) === 1
        ) {
            continue;
        }

        const isExternal =
            !contact.linked_phone_id;

        if (
            isExternal
            && !includeExternal
        ) {
            continue;
        }

        if (
            contact.linked_phone_id
            && excludedPhoneIds.has(
                Number(
                    contact.linked_phone_id
                )
            )
        ) {
            continue;
        }

        const title =
            contact.display_name
            || contact.linked_character_name
            || contact.phone_number
            || "Contact inconnu";

        const matchScore =
            calculateBestMatchScore(
                query,
                [
                    title,
                    contact.phone_number,
                    contact
                        .linked_character_name
                ]
            );

        if (
            query
            && matchScore <= 0
        ) {
            continue;
        }

        let score =
            matchScore;

        if (
            Number(contact.favorite) === 1
            && includeFavorites
        ) {
            score += 50;
        }

        if (
            Number(contact.pinned) === 1
        ) {
            score += 30;
        }

        score += Math.min(
            Number(
                contact.interaction_count
            ) || 0,
            20
        );

        score +=
            calculateRecencyBonus(
                contact
                    .last_interaction_at
            );

        if (!query) {
            score += 25;
        }

        results.push({
            type:
                Number(contact.favorite) === 1
                    ? "favorite"
                    : isExternal
                        ? "external"
                        : "contact",
            score,
            title,
            subtitle:
                contact.phone_number
                || getContactTypeLabel(
                    contact.contact_type
                ),
            avatar:
                contact
                    .linked_character_avatar_url
                || null,
            phoneId:
                contact.linked_phone_id
                    ? Number(
                        contact
                            .linked_phone_id
                    )
                    : null,
            contactId:
                Number(contact.id),
            conversationId:
                null,
            characterId:
                contact.linked_character_id
                    ? Number(
                        contact
                            .linked_character_id
                    )
                    : null,
            continuityId:
                contact.linked_continuity_id
                    ? Number(
                        contact
                            .linked_continuity_id
                    )
                    : null,
            phoneNumber:
                contact.phone_number
                || null,
            contactType:
                contact.contact_type,
            favorite:
                Number(
                    contact.favorite
                ) === 1,
            pinned:
                Number(
                    contact.pinned
                ) === 1,
            blocked:
                Number(
                    contact.blocked
                ) === 1,
            external:
                isExternal,
            group:
                false,
            source:
                "contacts",
            lastInteractionAt:
                contact
                    .last_interaction_at
                || null
        });
    }

    return results;
}

module.exports = {
    search
};
