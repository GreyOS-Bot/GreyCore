const db =
    require("./database");

function initializeProfileSchemaV2() {

    db.prepare(`
        CREATE TABLE IF NOT EXISTS CharacterProfilesV2 (

            continuity_id TEXT PRIMARY KEY,

            firstname TEXT,
            lastname TEXT,
            alias TEXT,

            age INTEGER,

            gender TEXT,

            height TEXT,

            weight TEXT,

            birthday TEXT,

            creation_date TEXT,

            origin TEXT,

            occupation TEXT,

            gang TEXT,

            faceclaim TEXT,

            story TEXT,

            created_at TEXT NOT NULL,

            updated_at TEXT NOT NULL,

            FOREIGN KEY(continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE

        )
    `).run();

    if (
        !columnExists(
            "CharacterProfilesV2",
            "creation_date"
        )
    ) {
        db.prepare(`
            ALTER TABLE CharacterProfilesV2
            ADD COLUMN creation_date TEXT
        `).run();
    }

    if (
        !columnExists(
            "CharacterProfilesV2",
            "alias"
        )
    ) {
        db.prepare(`
            ALTER TABLE CharacterProfilesV2
            ADD COLUMN alias TEXT
        `).run();
    }

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_profiles_v2_continuity
        ON CharacterProfilesV2(continuity_id)
    `).run();

    console.log(
        "✅ Table CharacterProfilesV2 prête."
    );

}

function columnExists(
    tableName,
    columnName
) {
    return db.prepare(`
        PRAGMA table_info(${tableName})
    `).all().some(
        column =>
            column.name === columnName
    );
}

module.exports =
    initializeProfileSchemaV2;
