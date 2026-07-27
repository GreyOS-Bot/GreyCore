const repository =
    require(
        "./PhoneContactRepository"
    );

function search(
    ownerPhoneId,
    query,
    limit = 10
) {
    const normalizedQuery =
        query?.trim();

    if (!normalizedQuery) {
        return repository
            .getForPhone(
                ownerPhoneId
            )
            .slice(
                0,
                limit
            );
    }

    return repository.search(
        ownerPhoneId,
        normalizedQuery,
        limit
    );
}

module.exports = {
    getById:
        repository.getById,
    getForPhone:
        repository.getForPhone,
    getFavoriteForPhone:
        repository.getFavoriteForPhone,
    getBlockedForPhone:
        repository.getBlockedForPhone,
    getByLinkedPhone:
        repository.getByLinkedPhone,
    getExternal:
        repository.getExternal,
    getPhoneById:
        repository.getPhoneById,
    getPhoneDetails:
        repository.getPhoneDetails,
    search
};
