function tableExists(db, name) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name));
}

function createSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS InstallationOutfitsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            context_id TEXT NOT NULL,
            installation_id INTEGER NOT NULL,
            image_url TEXT NOT NULL,
            image_data BLOB,
            image_filename TEXT,
            image_content_type TEXT,
            title TEXT,
            description TEXT,
            is_current INTEGER NOT NULL DEFAULT 0 CHECK(is_current IN (0,1)),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            legacy_outfit_id INTEGER UNIQUE,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id),
            FOREIGN KEY(context_id) REFERENCES Contexts(id),
            FOREIGN KEY(installation_id) REFERENCES CharacterGuildInstallationsV2(id) ON DELETE RESTRICT,
            FOREIGN KEY(legacy_outfit_id) REFERENCES ContinuityOutfitsV2(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_installation_outfits_installation
            ON InstallationOutfitsV2(installation_id);
        CREATE INDEX IF NOT EXISTS idx_installation_outfits_current
            ON InstallationOutfitsV2(installation_id,is_current);
        CREATE INDEX IF NOT EXISTS idx_installation_outfits_history
            ON InstallationOutfitsV2(installation_id,created_at DESC,id DESC);
        CREATE INDEX IF NOT EXISTS idx_installation_outfits_scope
            ON InstallationOutfitsV2(guild_id,context_id);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_installation_outfits_current
            ON InstallationOutfitsV2(installation_id) WHERE is_current=1;

        CREATE TRIGGER IF NOT EXISTS trg_installation_outfit_scope_insert
        BEFORE INSERT ON InstallationOutfitsV2
        WHEN NOT EXISTS (
            SELECT 1 FROM CharacterGuildInstallationsV2 i
            JOIN Contexts c ON c.id=NEW.context_id AND c.guild_id=NEW.guild_id
            WHERE i.id=NEW.installation_id AND i.guild_id=NEW.guild_id AND i.context_id=NEW.context_id
        ) BEGIN SELECT RAISE(ABORT,'Installation outfit scope mismatch'); END;

        CREATE TRIGGER IF NOT EXISTS trg_installation_outfit_scope_immutable
        BEFORE UPDATE OF guild_id,context_id,installation_id,legacy_outfit_id
        ON InstallationOutfitsV2
        BEGIN SELECT RAISE(ABORT,'Installation outfit scope is immutable'); END;
    `);
}

function migrate(db) {
    if (!["Guilds", "Contexts", "CharacterGuildInstallationsV2", "ContinuityOutfitsV2"]
        .every(name => tableExists(db, name))) return;
    const legacy = db.prepare("SELECT * FROM ContinuityOutfitsV2 ORDER BY continuity_id,id").all();
    const installations = db.prepare(`SELECT id,guild_id,context_id FROM CharacterGuildInstallationsV2
        WHERE continuity_id=? ORDER BY guild_id,context_id,id`);
    const currents = new Map();
    for (const row of legacy) if (Number(row.is_current) === 1)
        currents.set(row.continuity_id, (currents.get(row.continuity_id) || 0) + 1);
    const insert = db.prepare(`INSERT OR IGNORE INTO InstallationOutfitsV2
        (guild_id,context_id,installation_id,image_url,image_data,image_filename,image_content_type,title,description,is_current,created_at,updated_at,legacy_outfit_id)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const row of legacy) {
        const matches = installations.all(row.continuity_id);
        if (matches.length !== 1 || !matches[0].context_id || (currents.get(row.continuity_id) || 0) > 1) continue;
        const i = matches[0];
        insert.run(String(i.guild_id), i.context_id, i.id, row.image_url, row.image_data,
            row.image_filename, row.image_content_type, row.title, row.description,
            Number(row.is_current) === 1 ? 1 : 0, row.created_at, row.updated_at, row.id);
    }
}

module.exports = function initializeInstallationOutfitSchema(db) {
    createSchema(db);
    db.transaction(() => migrate(db))();
};
