const {
    normalize,
    getDateTimestamp,
    getMostRecentDate,
    mergeSources
} = require("./PhoneSearchUtils");

function mergeResults(
    results
) {
    const mergedResults =
        new Map();

    for (const result of results) {
        const key =
            getResultKey(
                result
            );

        const existing =
            mergedResults.get(key);

        if (!existing) {
            mergedResults.set(
                key,
                {
                    ...result
                }
            );

            continue;
        }

        const preferred =
            result.score >
            existing.score
                ? result
                : existing;

        const secondary =
            preferred === result
                ? existing
                : result;

        mergedResults.set(
            key,
            {
                ...secondary,
                ...preferred,
                score:
                    Math.max(
                        existing.score,
                        result.score
                    )
                    +
                    getMergeBonus(
                        existing,
                        result
                    ),
                contactId:
                    preferred.contactId
                    || secondary.contactId
                    || null,
                conversationId:
                    preferred
                        .conversationId
                    || secondary
                        .conversationId
                    || null,
                avatar:
                    preferred.avatar
                    || secondary.avatar
                    || null,
                lastInteractionAt:
                    getMostRecentDate(
                        existing
                            .lastInteractionAt,
                        result
                            .lastInteractionAt
                    ),
                source:
                    mergeSources(
                        existing.source,
                        result.source
                    )
            }
        );
    }

    return Array.from(
        mergedResults.values()
    );
}

function sortResults(
    results
) {
    return results.sort(
        (
            resultA,
            resultB
        ) => {
            if (
                resultB.score !==
                resultA.score
            ) {
                return (
                    resultB.score -
                    resultA.score
                );
            }

            const dateA =
                getDateTimestamp(
                    resultA
                        .lastInteractionAt
                );

            const dateB =
                getDateTimestamp(
                    resultB
                        .lastInteractionAt
                );

            if (dateB !== dateA) {
                return dateB - dateA;
            }

            return (
                resultA.title || ""
            ).localeCompare(
                resultB.title || "",
                "fr",
                {
                    sensitivity:
                        "base"
                }
            );
        }
    );
}

function getResultKey(
    result
) {
    if (result.group) {
        return (
            `group:${result.conversationId}`
        );
    }

    if (result.phoneId) {
        return (
            `phone:${result.phoneId}`
        );
    }

    if (result.contactId) {
        return (
            `contact:${result.contactId}`
        );
    }

    if (result.conversationId) {
        return (
            `conversation:${result.conversationId}`
        );
    }

    return [
        "external",
        normalize(
            result.title || ""
        ),
        normalize(
            result.phoneNumber || ""
        )
    ].join(":");
}

function getMergeBonus(
    firstResult,
    secondResult
) {
    let bonus = 0;

    if (
        firstResult.source !==
        secondResult.source
    ) {
        bonus += 15;
    }

    if (
        firstResult.contactId
        || secondResult.contactId
    ) {
        bonus += 10;
    }

    if (
        firstResult.conversationId
        || secondResult.conversationId
    ) {
        bonus += 10;
    }

    return bonus;
}

module.exports = {
    mergeResults,
    sortResults,
    getResultKey,
    getMergeBonus
};
