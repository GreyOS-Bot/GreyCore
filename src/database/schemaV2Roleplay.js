const db =
    require("./database");

function initializeRoleplaySchemaV2() {
    /*
     * RELATIONS ENTRE CONTINUITÉS
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS ContinuityRelationshipsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            guild_id TEXT NOT NULL,

            character_a_id TEXT NOT NULL,
            continuity_a_id TEXT NOT NULL,

            character_b_id TEXT NOT NULL,
            continuity_b_id TEXT NOT NULL,

            relationship_type_id INTEGER NOT NULL,

            note TEXT,
            started_at TEXT,
            ended_at TEXT,

            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE,

            FOREIGN KEY(character_a_id)
                REFERENCES CharactersV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(character_b_id)
                REFERENCES CharactersV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(continuity_a_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(continuity_b_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(relationship_type_id)
                REFERENCES RelationshipTypes(id)
                ON DELETE CASCADE,

            UNIQUE(
                continuity_a_id,
                continuity_b_id,
                relationship_type_id
            )
        )
    `).run();

    ensureColumns(
        "ContinuityRelationshipsV2",
        {
            guild_id:
                "TEXT",
            character_a_id:
                "TEXT",
            character_b_id:
                "TEXT",
            note:
                "TEXT",
            started_at:
                "TEXT",
            ended_at:
                "TEXT",
            created_by:
                "TEXT",
            created_at:
                "TEXT",
            updated_at:
                "TEXT"
        }
    );

    /*
     * DEMANDES DE RELATION
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS PendingContinuityRelationshipsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            requester_continuity_id TEXT NOT NULL,
            target_continuity_id TEXT NOT NULL,

            relationship_type_id INTEGER NOT NULL,

            requested_by TEXT NOT NULL,
            target_owner_id TEXT NOT NULL,

            note TEXT,
            started_at TEXT,

            status TEXT NOT NULL DEFAULT 'pending',

            created_at TEXT NOT NULL,

            responded_at TEXT,
            responded_by TEXT,

            FOREIGN KEY(requester_continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(target_continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(relationship_type_id)
                REFERENCES RelationshipTypes(id)
                ON DELETE CASCADE
        )
    `).run();

    ensureColumns(
        "PendingContinuityRelationshipsV2",
        {
            note:
                "TEXT",
            started_at:
                "TEXT"
        }
    );

    /*
     * ÉTATS
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS ContinuityStatesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            continuity_id TEXT NOT NULL,

            state_type_id INTEGER NOT NULL,

            note TEXT,

            started_at TEXT NOT NULL,
            ended_at TEXT,

            created_by TEXT NOT NULL,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(state_type_id)
                REFERENCES StateTypes(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * RENCONTRES
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS ContinuityEncountersV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            continuity_a_id TEXT NOT NULL,
            continuity_b_id TEXT,

            external_name TEXT,

            location TEXT,
            note TEXT,

            occurred_at TEXT NOT NULL,

            created_by TEXT NOT NULL,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(continuity_a_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(continuity_b_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE
        )
    `).run();

        /*
     * APPELS TÉLÉPHONIQUES
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS PhoneCallsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            caller_phone_id INTEGER NOT NULL,
            receiver_phone_id INTEGER NOT NULL,

            status TEXT NOT NULL
                CHECK (
                    status IN (
                        'ringing',
                        'accepted',
                        'refused',
                        'missed',
                        'cancelled',
                        'ended'
                    )
                ),

            created_at TEXT NOT NULL,
            updated_at TEXT,
            answered_at TEXT,
            ended_at TEXT,

            FOREIGN KEY(caller_phone_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(receiver_phone_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE CASCADE,

            CHECK (
                caller_phone_id !=
                receiver_phone_id
            )
        )
    `).run();

    /*
     * Les premières versions des appels ne possédaient
     * pas de date de mise à jour. La colonne reste
     * facultative pour que SQLite puisse l’ajouter sans
     * risquer de perdre les appels déjà enregistrés.
     */
    ensureColumns(
        "PhoneCallsV2",
        {
            updated_at:
                "TEXT"
        }
    );

    db.prepare(`
        UPDATE PhoneCallsV2
        SET updated_at = created_at
        WHERE updated_at IS NULL
    `).run();

        /*
     * MESSAGES DES APPELS TÉLÉPHONIQUES
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS PhoneCallMessagesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            call_id INTEGER NOT NULL,

            speaker_phone_id INTEGER NOT NULL,

            content TEXT NOT NULL,

            created_at TEXT NOT NULL,

            FOREIGN KEY(call_id)
                REFERENCES PhoneCallsV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(speaker_phone_id)
                REFERENCES ContinuityPhonesV2(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * INDEX
     */
    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_relationships_v2_continuity_a
        ON ContinuityRelationshipsV2(
            continuity_a_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_relationships_v2_continuity_b
        ON ContinuityRelationshipsV2(
            continuity_b_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_pending_relationships_v2_target_owner
        ON PendingContinuityRelationshipsV2(
            target_owner_id,
            status
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_states_v2_continuity
        ON ContinuityStatesV2(
            continuity_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_encounters_v2_continuity_a
        ON ContinuityEncountersV2(
            continuity_a_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_encounters_v2_continuity_b
        ON ContinuityEncountersV2(
            continuity_b_id
        )
    `).run();

        db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_calls_v2_caller
        ON PhoneCallsV2(
            caller_phone_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_calls_v2_receiver
        ON PhoneCallsV2(
            receiver_phone_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_calls_v2_status
        ON PhoneCallsV2(
            status
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_calls_v2_caller_status
        ON PhoneCallsV2(
            caller_phone_id,
            status
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_calls_v2_receiver_status
        ON PhoneCallsV2(
            receiver_phone_id,
            status
        )
    `).run();

        db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_call_messages_v2_call
        ON PhoneCallMessagesV2(
            call_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_phone_call_messages_v2_speaker
        ON PhoneCallMessagesV2(
            speaker_phone_id
        )
    `).run();

    console.log(
        "✅ Tables RP de Greycore Database V2 prêtes."
    );
}

function ensureColumns(
    tableName,
    columnDefinitions
) {
    const existingColumns =
        new Set(
            db.prepare(
                `PRAGMA table_info(${tableName})`
            )
                .all()
                .map(
                    column =>
                        column.name
                )
        );

    for (
        const [
            columnName,
            definition
        ]
        of Object.entries(
            columnDefinitions
        )
    ) {
        if (
            existingColumns.has(
                columnName
            )
        ) {
            continue;
        }

        db.prepare(`
            ALTER TABLE ${tableName}
            ADD COLUMN ${columnName}
                ${definition}
        `).run();
    }
}

module.exports =
    initializeRoleplaySchemaV2;
