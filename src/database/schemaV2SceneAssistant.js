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

    db.prepare(`
        CREATE TABLE IF NOT EXISTS ScenesV2 (
            id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            started_at TEXT NOT NULL,
            last_rp_message_at TEXT,
            rp_message_count INTEGER NOT NULL DEFAULT 0,
            threshold_notified_at TEXT,
            created_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            ended_at TEXT,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS SceneChannelsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scene_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            linked_at TEXT NOT NULL,
            unlinked_at TEXT,
            source_channel_id TEXT,
            transition_message_id TEXT,
            created_by TEXT,
            FOREIGN KEY(scene_id) REFERENCES ScenesV2(id) ON DELETE CASCADE,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS
            idx_scene_channels_v2_active_channel
        ON SceneChannelsV2(guild_id, channel_id)
        WHERE unlinked_at IS NULL
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS SceneParticipantsV2 (
            scene_id TEXT NOT NULL,
            character_id TEXT NOT NULL,
            joined_at TEXT NOT NULL,
            left_at TEXT,
            PRIMARY KEY(scene_id, character_id),
            FOREIGN KEY(scene_id) REFERENCES ScenesV2(id) ON DELETE CASCADE,
            FOREIGN KEY(character_id) REFERENCES CharactersV2(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_scenes_v2_guild_status
        ON ScenesV2(guild_id, status)
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS SceneAssistantChannelPromptsV2 (
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            last_prompt_at TEXT NOT NULL,
            PRIMARY KEY(guild_id, channel_id),
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS SceneTimelineWarningsV2 (
            scene_a_id TEXT NOT NULL,
            scene_b_id TEXT NOT NULL,
            character_id TEXT NOT NULL,
            warned_at TEXT NOT NULL,
            PRIMARY KEY(scene_a_id, scene_b_id, character_id),
            FOREIGN KEY(scene_a_id) REFERENCES ScenesV2(id) ON DELETE CASCADE,
            FOREIGN KEY(scene_b_id) REFERENCES ScenesV2(id) ON DELETE CASCADE,
            FOREIGN KEY(character_id) REFERENCES CharactersV2(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildSceneTriggerExpressionsV2 (
            guild_id TEXT NOT NULL,
            expression TEXT NOT NULL,
            normalized_expression TEXT NOT NULL,
            created_by TEXT,
            created_at TEXT NOT NULL,
            PRIMARY KEY(guild_id, normalized_expression),
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        )
    `).run();

    ensureColumn(
        "GuildSceneAssistantSettingsV2",
        "inactivity_hours",
        "INTEGER NOT NULL DEFAULT 48"
    );

    db.prepare(`
        CREATE TABLE IF NOT EXISTS SceneStartProposalsV2 (
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            character_id TEXT,
            proposed_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            PRIMARY KEY(guild_id, channel_id),
            UNIQUE(message_id),
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE,
            FOREIGN KEY(character_id) REFERENCES CharactersV2(id) ON DELETE SET NULL
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS SceneClosurePromptsV2 (
            scene_id TEXT PRIMARY KEY,
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            message_id TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'pending',
            prompted_at TEXT NOT NULL,
            resolved_at TEXT,
            FOREIGN KEY(scene_id) REFERENCES ScenesV2(id) ON DELETE CASCADE,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS SceneClosureVotesV2 (
            scene_id TEXT NOT NULL,
            discord_user_id TEXT NOT NULL,
            voted_at TEXT NOT NULL,
            PRIMARY KEY(scene_id, discord_user_id),
            FOREIGN KEY(scene_id) REFERENCES ScenesV2(id) ON DELETE CASCADE
        )
    `).run();
}

function ensureColumn(tableName, columnName, definition) {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (!columns.some(column => column.name === columnName)) {
        db.prepare(
            `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
        ).run();
    }
}

module.exports = initializeSceneAssistantSchemaV2;
