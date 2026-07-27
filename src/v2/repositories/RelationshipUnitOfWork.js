const db =
    require(
        "../../database/database"
    );

class RelationshipUnitOfWork {

    run(
        work
    ) {
        return db.transaction(
            work
        )();
    }

}

module.exports =
    new RelationshipUnitOfWork();
