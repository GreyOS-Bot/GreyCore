const db =
    require("./database");

function initializeAutomationSchemaV2() {
    /*
     * AUTOMATISATIONS APRÈS VALIDATION
     *
     * Une configuration est propre à chaque serveur. Elle reste
     * désactivée tant que le staff ne l'a pas explicitement configurée.
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildCharacterApprovalAutomationsV2 (
            guild_id TEXT PRIMARY KEY,

            is_enabled INTEGER NOT NULL DEFAULT 0,
            approved_character_count INTEGER NOT NULL DEFAULT 2,

            required_role_id TEXT,
            remove_role_id TEXT,
            add_role_id TEXT,

            welcome_channel_id TEXT,
            welcome_message TEXT,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * Ce journal empêche une même automatisation de se rejouer pour un
     * membre. Le statut pending protège aussi les validations effectuées
     * presque au même moment.
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildCharacterApprovalAutomationRunsV2 (
            guild_id TEXT NOT NULL,
            discord_user_id TEXT NOT NULL,

            approved_character_count INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',

            claimed_at TEXT NOT NULL,
            completed_at TEXT,

            PRIMARY KEY(guild_id, discord_user_id),

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_character_approval_automation_runs_v2_status
        ON GuildCharacterApprovalAutomationRunsV2(
            guild_id,
            status
        )
    `).run();
}

module.exports = initializeAutomationSchemaV2;
