const db =
    require(
        "../../database/database"
    );

class UserRepository {

    getById(
        userId
    ) {
        return db.prepare(`
            SELECT *
            FROM UsersV2
            WHERE id = ?
        `).get(
            userId
        );
    }

    getByDiscordUserId(
        discordUserId
    ) {
        return db.prepare(`
            SELECT *
            FROM UsersV2
            WHERE discord_user_id = ?
        `).get(
            discordUserId
        );
    }

    insert(
        discordUserId,
        createdAt
    ) {
        const result =
            db.prepare(`
                INSERT INTO UsersV2 (
                    discord_user_id,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?)
            `).run(
                discordUserId,
                createdAt,
                createdAt
            );

        return this.getById(
            result.lastInsertRowid
        );
    }

    touch(
        userId,
        updatedAt
    ) {
        db.prepare(`
            UPDATE UsersV2
            SET updated_at = ?
            WHERE id = ?
        `).run(
            updatedAt,
            userId
        );

        return this.getById(
            userId
        );
    }

}

module.exports =
    new UserRepository();
