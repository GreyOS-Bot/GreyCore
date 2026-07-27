const db =
    require(
        "../../database/database"
    );

function run(
    operation,
    ...parameters
) {
    return db
        .transaction(
            operation
        )(
            ...parameters
        );
}

module.exports = {
    run
};
