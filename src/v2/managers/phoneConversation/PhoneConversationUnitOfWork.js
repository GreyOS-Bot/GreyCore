const repository =
    require(
        "./PhoneConversationRepository"
    );

function run(
    operation
) {
    return repository
        .runInTransaction(
            operation
        );
}

module.exports = {
    run
};
