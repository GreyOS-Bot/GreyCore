function normalize(
    value
) {
    return String(
        value || ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .toLowerCase();
}

function calculateBestMatchScore(
    normalizedQuery,
    values
) {
    if (!normalizedQuery) {
        return 0;
    }

    let bestScore = 0;

    for (const value of values) {
        const normalizedValue =
            normalize(value);

        if (!normalizedValue) {
            continue;
        }

        let score = 0;

        if (
            normalizedValue ===
            normalizedQuery
        ) {
            score = 200;
        } else if (
            normalizedValue.startsWith(
                normalizedQuery
            )
        ) {
            score = 120;
        } else if (
            normalizedValue.includes(
                normalizedQuery
            )
        ) {
            score = 60;
        } else {
            const words =
                normalizedValue.split(
                    /\s+/
                );

            if (
                words.some(
                    word =>
                        word.startsWith(
                            normalizedQuery
                        )
                )
            ) {
                score = 90;
            }
        }

        bestScore =
            Math.max(
                bestScore,
                score
            );
    }

    return bestScore;
}

function getDateTimestamp(
    dateValue
) {
    if (!dateValue) {
        return 0;
    }

    const timestamp =
        new Date(
            dateValue
        ).getTime();

    return Number.isNaN(timestamp)
        ? 0
        : timestamp;
}

function calculateRecencyBonus(
    dateValue
) {
    const timestamp =
        getDateTimestamp(
            dateValue
        );

    if (!timestamp) {
        return 0;
    }

    const elapsedDays =
        (
            Date.now() -
            timestamp
        )
        /
        (
            1000 *
            60 *
            60 *
            24
        );

    if (elapsedDays <= 1) {
        return 25;
    }

    if (elapsedDays <= 7) {
        return 20;
    }

    if (elapsedDays <= 30) {
        return 15;
    }

    if (elapsedDays <= 90) {
        return 10;
    }

    if (elapsedDays <= 365) {
        return 5;
    }

    return 0;
}

function getContactTypeLabel(
    contactType
) {
    const labels = {
        greycore:
            "Personnage Greycore",
        external:
            "Contact externe",
        plural:
            "PluralKit",
        tupperbox:
            "Tupperbox",
        npc:
            "PNJ"
    };

    return (
        labels[contactType]
        || "Contact"
    );
}

function getMostRecentDate(
    firstDate,
    secondDate
) {
    const firstTimestamp =
        getDateTimestamp(
            firstDate
        );

    const secondTimestamp =
        getDateTimestamp(
            secondDate
        );

    return secondTimestamp >
        firstTimestamp
        ? secondDate
        : firstDate;
}

function mergeSources(
    firstSource,
    secondSource
) {
    const sources =
        new Set();

    for (
        const source
        of [
            firstSource,
            secondSource
        ]
    ) {
        if (!source) {
            continue;
        }

        for (
            const item
            of String(source).split(",")
        ) {
            sources.add(
                item.trim()
            );
        }
    }

    return Array.from(
        sources
    ).join(",");
}

module.exports = {
    normalize,
    calculateBestMatchScore,
    getDateTimestamp,
    calculateRecencyBonus,
    getContactTypeLabel,
    getMostRecentDate,
    mergeSources
};
