const repository =
    require(
        "./PhoneContactRepository"
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
