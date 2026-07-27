const db =
    require(
        "../../database/database"
    );

function ensure(
    guildId,
    guildName,
    createdAt
) {
    db.prepare(`
        INSERT INTO Guilds (
            id,
            name,
            created_at
        )
        VALUES (?, ?, ?)

        ON CONFLICT(id)
        DO UPDATE SET
            name = excluded.name
    `).run(
        guildId,
        guildName,
        createdAt
    );
}

module.exports = {
    ensure
};
