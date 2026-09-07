const { randomUUID } = require("node:crypto");

function columnExists(db, table, column) {
    return db.prepare(`PRAGMA table_info(${table})`).all()
        .some(row => row.name === column);
}

module.exports = function initializeInstallationContexts(db) {
    require("./ContextSchema")(db);

    if (!columnExists(db, "CharacterGuildInstallationsV2", "context_id")) {
        db.prepare(`
            ALTER TABLE CharacterGuildInstallationsV2
            ADD COLUMN context_id TEXT REFERENCES Contexts(id)
        `).run();
    }

    const guildTableExists = Boolean(db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Guilds'"
    ).get());
    if (!guildTableExists) {
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_installations_v2_guild_context
                ON CharacterGuildInstallationsV2(guild_id, context_id);
            CREATE INDEX IF NOT EXISTS idx_installations_v2_guild_context_status
                ON CharacterGuildInstallationsV2(guild_id, context_id, status);
            CREATE INDEX IF NOT EXISTS idx_installations_v2_context_status
                ON CharacterGuildInstallationsV2(context_id, status);
        `);
        return;
    }

    const migrate = db.transaction(() => {
        const guilds = db.prepare(`
            SELECT DISTINCT guild_id
            FROM CharacterGuildInstallationsV2
            WHERE context_id IS NULL
        `).all();

        const getDefault = db.prepare(`
            SELECT id FROM Contexts
            WHERE guild_id = ? AND is_default = 1
        `);
        const getActive = db.prepare(`
            SELECT id FROM Contexts
            WHERE guild_id = ? AND is_active = 1
            ORDER BY created_at, id LIMIT 1
        `);
        const createDefault = db.prepare(`
            INSERT INTO Contexts (
                id, guild_id, key, name, description, is_active,
                is_default, parent_context_id, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, 'Contexte par défaut', '', 1, 1, NULL, NULL, ?, ?)
        `);
        const setDefault = db.prepare(`
            UPDATE Contexts SET is_default = 1, updated_at = ?
            WHERE guild_id = ? AND id = ?
        `);
        const backfill = db.prepare(`
            UPDATE CharacterGuildInstallationsV2
            SET context_id = ?
            WHERE guild_id = ? AND context_id IS NULL
        `);

        for (const { guild_id: guildId } of guilds) {
            const now = new Date().toISOString();
            let context = getDefault.get(guildId);
            if (!context) {
                context = getActive.get(guildId);
                if (context) {
                    setDefault.run(now, guildId, context.id);
                } else {
                    context = { id: randomUUID() };
                    let key = "default";
                    let suffix = 1;
                    while (db.prepare("SELECT 1 FROM Contexts WHERE guild_id = ? AND key = ?").get(guildId, key)) {
                        key = `default-${suffix++}`;
                    }
                    createDefault.run(context.id, guildId, key, now, now);
                }
            }
            backfill.run(context.id, guildId);
        }
    });
    migrate();

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_installations_v2_guild_context
            ON CharacterGuildInstallationsV2(guild_id, context_id);
        CREATE INDEX IF NOT EXISTS idx_installations_v2_guild_context_status
            ON CharacterGuildInstallationsV2(guild_id, context_id, status);
        CREATE INDEX IF NOT EXISTS idx_installations_v2_context_status
            ON CharacterGuildInstallationsV2(context_id, status);
        CREATE TRIGGER IF NOT EXISTS trg_installations_context_insert
        BEFORE INSERT ON CharacterGuildInstallationsV2
        WHEN NEW.context_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM Contexts
            WHERE id = NEW.context_id AND guild_id = NEW.guild_id AND is_active = 1
        )
        BEGIN
            SELECT RAISE(ABORT, 'Installation Context must belong to Guild');
        END;
        CREATE TRIGGER IF NOT EXISTS trg_installations_context_bind_legacy
        AFTER INSERT ON CharacterGuildInstallationsV2
        WHEN NEW.context_id IS NULL
        BEGIN
            UPDATE Contexts SET is_default = 1, updated_at = NEW.updated_at
            WHERE id = (
                SELECT id FROM Contexts WHERE guild_id = NEW.guild_id AND is_active = 1
                ORDER BY created_at, id LIMIT 1
            ) AND NOT EXISTS (
                SELECT 1 FROM Contexts WHERE guild_id = NEW.guild_id AND is_default = 1
            );
            INSERT INTO Contexts (
                id, guild_id, key, name, description, is_active, is_default,
                parent_context_id, created_by, created_at, updated_at
            )
            SELECT lower(hex(randomblob(16))), NEW.guild_id,
                'default-' || lower(hex(randomblob(4))), 'Contexte par défaut',
                '', 1, 1, NULL, NULL, NEW.installed_at, NEW.updated_at
            WHERE NOT EXISTS (
                SELECT 1 FROM Contexts WHERE guild_id = NEW.guild_id AND is_default = 1
            );
            UPDATE CharacterGuildInstallationsV2
            SET context_id = (
                SELECT id FROM Contexts WHERE guild_id = NEW.guild_id AND is_default = 1
            ) WHERE id = NEW.id AND context_id IS NULL;
        END;
        CREATE TRIGGER IF NOT EXISTS trg_installations_context_immutable
        BEFORE UPDATE OF context_id, guild_id ON CharacterGuildInstallationsV2
        WHEN OLD.context_id IS NOT NULL
        AND (NEW.context_id IS NOT OLD.context_id OR NEW.guild_id IS NOT OLD.guild_id)
        BEGIN
            SELECT RAISE(ABORT, 'Installation Context is immutable');
        END;
    `);
};
