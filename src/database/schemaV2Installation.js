const db =
    require("./database");

function columnExists(
    tableName,
    columnName
) {
    const columns = db.prepare(`
        PRAGMA table_info(${tableName})
    `).all();

    return columns.some(
        column =>
            column.name === columnName
    );
}

function initializeInstallationSchemaV2() {
    /*
     * AVATAR LOCAL PAR SERVEUR
     *
     * La table existe déjà chez toi.
     * CREATE TABLE IF NOT EXISTS ne peut pas
     * ajouter une nouvelle colonne à une table existante.
     *
     * On utilise donc ALTER TABLE uniquement
     * si la colonne n'existe pas encore.
     */
    if (
        !columnExists(
            "CharacterGuildInstallationsV2",
            "local_avatar_url"
        )
    ) {
        db.prepare(`
            ALTER TABLE
                CharacterGuildInstallationsV2
            ADD COLUMN
                local_avatar_url TEXT
        `).run();

        console.log(
            "✅ Colonne local_avatar_url ajoutée aux installations V2."
        );
    }

    /*
     * MESSAGE DE SUIVI STAFF
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS CharacterInstallationMessagesV2 (
            installation_id INTEGER PRIMARY KEY,

            guild_id TEXT NOT NULL,

            channel_id TEXT NOT NULL,

            message_id TEXT NOT NULL,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(installation_id)
                REFERENCES CharacterGuildInstallationsV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * DEMANDES DE MODIFICATION APRÈS VALIDATION
     *
     * Les nouvelles valeurs sont conservées séparément de la
     * fiche active jusqu’à la décision du staff. Cela permet au
     * personnage de rester jouable avec ses informations validées.
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS CharacterChangeRequestsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            installation_id INTEGER NOT NULL,
            character_id TEXT NOT NULL,
            continuity_id TEXT NOT NULL,

            request_type TEXT NOT NULL,
            changes_json TEXT NOT NULL,

            status TEXT NOT NULL DEFAULT 'pending',

            submitted_by TEXT NOT NULL,
            submitted_at TEXT NOT NULL,

            reviewed_by TEXT,
            reviewed_at TEXT,
            rejection_reason TEXT,

            validation_channel_id TEXT,
            validation_message_id TEXT,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(installation_id)
                REFERENCES CharacterGuildInstallationsV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(character_id)
                REFERENCES CharactersV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * HISTORIQUE DES DÉCISIONS DE VALIDATION
     *
     * Une installation peut être refusée puis soumise à nouveau.
     * Les informations de statut de l'installation ne suffisent donc
     * pas à retrouver les décisions précédentes du staff.
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS InstallationValidationHistoryV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            installation_id INTEGER NOT NULL,

            event_type TEXT NOT NULL,
            previous_status TEXT,
            current_status TEXT NOT NULL,

            actor_id TEXT,
            reason TEXT,

            occurred_at TEXT NOT NULL,

            FOREIGN KEY(installation_id)
                REFERENCES CharacterGuildInstallationsV2(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * MODULES ACTIVABLES PAR SERVEUR
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildModulesV2 (
            guild_id TEXT NOT NULL,

            module_key TEXT NOT NULL,

            is_enabled INTEGER NOT NULL DEFAULT 1,

            updated_at TEXT NOT NULL,

            PRIMARY KEY(
                guild_id,
                module_key
            ),

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * PARAMÈTRES PROPRES À CHAQUE SERVEUR
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildSettingsV2 (
            guild_id TEXT PRIMARY KEY,

            validation_channel_id TEXT,
            error_log_channel_id TEXT,
            pj_creation_limit_enabled INTEGER NOT NULL DEFAULT 0,
            pj_creation_limit_count INTEGER NOT NULL DEFAULT 2,
            pj_creation_limit_window_days INTEGER NOT NULL DEFAULT 7,
            maintenance_enabled INTEGER NOT NULL DEFAULT 0,
            maintenance_message TEXT,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * INDEX
     */
    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_installation_messages_v2_guild
        ON CharacterInstallationMessagesV2(
            guild_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_change_requests_v2_installation
        ON CharacterChangeRequestsV2(
            installation_id,
            status
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_installation_validation_history_v2
        ON InstallationValidationHistoryV2(
            installation_id,
            id DESC
        )
    `).run();

    if (
        !columnExists(
            "GuildSettingsV2",
            "error_log_channel_id"
        )
    ) {
        db.prepare(`
            ALTER TABLE GuildSettingsV2
            ADD COLUMN error_log_channel_id TEXT
        `).run();

        console.log(
            "✅ Colonne error_log_channel_id ajoutée aux paramètres V2."
        );
    }

    for (
        const [column, definition]
        of [
            [
                "pj_creation_limit_enabled",
                "INTEGER NOT NULL DEFAULT 0"
            ],
            [
                "pj_creation_limit_count",
                "INTEGER NOT NULL DEFAULT 2"
            ],
            [
                "pj_creation_limit_window_days",
                "INTEGER NOT NULL DEFAULT 7"
            ],
            [
                "maintenance_enabled",
                "INTEGER NOT NULL DEFAULT 0"
            ],
            [
                "maintenance_message",
                "TEXT"
            ]
        ]
    ) {
        if (!columnExists("GuildSettingsV2", column)) {
            db.prepare(`
                ALTER TABLE GuildSettingsV2
                ADD COLUMN ${column} ${definition}
            `).run();
        }
    }

    db.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS
            idx_change_requests_v2_pending_type
        ON CharacterChangeRequestsV2(
            installation_id,
            request_type
        )
        WHERE status = 'pending'
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_guild_modules_v2_guild
        ON GuildModulesV2(
            guild_id
        )
    `).run();

    console.log(
        "✅ Tables Installation, Modules et Paramètres de Greycore Database V2 prêtes."
    );
}

module.exports =
    initializeInstallationSchemaV2;
