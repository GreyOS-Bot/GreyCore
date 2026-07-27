const repository =
    require(
        "../repositories/PhoneSearchRepository"
    );

const contactSearchSource =
    require(
        "./phoneSearch/PhoneContactSearchSource"
    );

const greycoreSearchSource =
    require(
        "./phoneSearch/PhoneGreycoreSearchSource"
    );

const conversationSearchSource =
    require(
        "./phoneSearch/PhoneConversationSearchSource"
    );

const resultMerger =
    require(
        "./phoneSearch/PhoneSearchResultMerger"
    );

const searchUtils =
    require(
        "./phoneSearch/PhoneSearchUtils"
    );

class PhoneSearchV2Manager {

    search(
        options = {}
    ) {
        const viewerPhoneId =
            Number(
                options.viewerPhoneId
            );

        const guildId =
            options.guildId
                ? String(
                    options.guildId
                )
                : null;

        if (!guildId) {
            throw new Error(
                "Le serveur utilisé pour la recherche est obligatoire."
            );
        }

        if (!viewerPhoneId) {
            throw new Error(
                "Le téléphone utilisé pour la recherche est obligatoire."
            );
        }

        const viewerPhone =
            this.getPhoneById(
                viewerPhoneId
            );

        if (!viewerPhone) {
            throw new Error(
                "Téléphone introuvable."
            );
        }

        const query =
            this.normalize(
                options.query || ""
            );

        const limit =
            Math.max(
                1,
                Math.min(
                    Number(
                        options.limit
                    ) || 20,
                    50
                )
            );

        const excludedPhoneIds =
            new Set(
                [
                    viewerPhoneId,
                    ...(
                        options
                            .excludePhoneIds
                        || []
                    )
                ]
                    .map(Number)
                    .filter(Boolean)
            );

        const results = [];

        if (
            options.includeContacts !==
            false
        ) {
            results.push(
                ...this.searchContacts({
                    viewerPhoneId,
                    query,
                    includeExternal:
                        options
                            .includeExternal
                        !== false,
                    includeFavorites:
                        options
                            .includeFavorites
                        !== false,
                    includeBlocked:
                        options
                            .includeBlocked
                        === true,
                    excludedPhoneIds
                })
            );
        }

        if (
            options.includeGreycore !==
            false
        ) {
            results.push(
                ...this.searchGreycore({
                    viewerPhoneId,
                    guildId,
                    query,
                    excludedPhoneIds
                })
            );
        }

        if (
            options.includeRecent !==
            false
        ) {
            results.push(
                ...this
                    .searchRecentConversations({
                        viewerPhoneId,
                        query,
                        includeGroups:
                            options
                                .includeGroups
                            !== false,
                        excludedPhoneIds
                    })
            );
        }

        return this.sortResults(
            this.mergeResults(
                results
            )
        ).slice(
            0,
            limit
        );
    }

    searchContacts(
        options
    ) {
        return contactSearchSource
            .search(options);
    }

    searchGreycore(
        options
    ) {
        return greycoreSearchSource
            .search(options);
    }

    searchRecentConversations(
        options
    ) {
        return conversationSearchSource
            .search(options);
    }

    mergeResults(
        results
    ) {
        return resultMerger
            .mergeResults(
                results
            );
    }

    sortResults(
        results
    ) {
        return resultMerger
            .sortResults(
                results
            );
    }

    getResultKey(
        result
    ) {
        return resultMerger
            .getResultKey(
                result
            );
    }

    getMergeBonus(
        firstResult,
        secondResult
    ) {
        return resultMerger
            .getMergeBonus(
                firstResult,
                secondResult
            );
    }

    calculateBestMatchScore(
        normalizedQuery,
        values
    ) {
        return searchUtils
            .calculateBestMatchScore(
                normalizedQuery,
                values
            );
    }

    calculateRecencyBonus(
        dateValue
    ) {
        return searchUtils
            .calculateRecencyBonus(
                dateValue
            );
    }

    normalize(
        value
    ) {
        return searchUtils
            .normalize(
                value
            );
    }

    getContactTypeLabel(
        contactType
    ) {
        return searchUtils
            .getContactTypeLabel(
                contactType
            );
    }

    getDateTimestamp(
        dateValue
    ) {
        return searchUtils
            .getDateTimestamp(
                dateValue
            );
    }

    getMostRecentDate(
        firstDate,
        secondDate
    ) {
        return searchUtils
            .getMostRecentDate(
                firstDate,
                secondDate
            );
    }

    mergeSources(
        firstSource,
        secondSource
    ) {
        return searchUtils
            .mergeSources(
                firstSource,
                secondSource
            );
    }

    getPhoneById(
        phoneId
    ) {
        return repository
            .getPhoneById(
                phoneId
            );
    }
}

module.exports =
    new PhoneSearchV2Manager();
