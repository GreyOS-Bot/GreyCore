const db =
    require("./database");

function initializeSceneAssistantSchemaV2() {
    /*
     * ASSISTANT DE GESTION DES SCENES
     *
     * Le suivi reste entierement opt-in : sans configuration active et sans
     * zone RP, aucun message n'est analyse par cet assistant.
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildSceneAssistantSettingsV2 (
            guild_id TEXT PRIMARY KEY,

            is_enabled INTEGER NOT NULL DEFAULT 0,
            duration_days INTEGER,
            recommended_message_count INTEGER,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * Une zone peut etre un salon, une categorie ou un forum. Les fils d'un
     * forum et les salons contenus dans une categorie sont resolus au moment
     * de recevoir le message Discord.
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildSceneAssistantScopesV2 (
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,

            created_by TEXT,
            created_at TEXT NOT NULL,

            PRIMARY KEY(guild_id, channel_id),

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE
        )
    `).run();

    /*
     * Un cycle est propre a un salon RP concret. Un nouveau cycle ne ferme
     * jamais le salon : il remet simplement ses compteurs a zero.
     */
    db.prepare(`
        CREATE TABLE IF NOT EXISTS SceneAssistantCyclesV2 (
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,

            started_at TEXT NOT NULL,
            last_rp_message_at TEXT,
            rp_message_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active',
            threshold_notified_at TEXT,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            PRIMARY KEY(guild_id, channel_id),

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_scene_assistant_cycles_v2_status
        ON SceneAssistantCyclesV2(guild_id, status)
    `).run();
}

module.exports = initializeSceneAssistantSchemaV2;
