const db =
    require("./database");

function initializeAssetSchemaV2() {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS AssetTypesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            guild_id TEXT NOT NULL,
            type_key TEXT NOT NULL,
            label TEXT NOT NULL,
            emoji TEXT,

            is_system INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,

            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE,

            UNIQUE(guild_id, type_key)
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS ContinuityAssetsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            guild_id TEXT NOT NULL,
            continuity_id TEXT NOT NULL,
            asset_type_id INTEGER NOT NULL,

            name TEXT NOT NULL,
            description TEXT,
            details TEXT,
            image_url TEXT,

            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE,

            FOREIGN KEY(continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(asset_type_id)
                REFERENCES AssetTypesV2(id)
                ON DELETE RESTRICT
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS ContinuityAssetTransfersV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            asset_id INTEGER NOT NULL,
            guild_id TEXT NOT NULL,
            from_continuity_id TEXT NOT NULL,
            to_continuity_id TEXT NOT NULL,
            transferred_by TEXT NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL,

            FOREIGN KEY(asset_id)
                REFERENCES ContinuityAssetsV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(guild_id)
                REFERENCES Guilds(id)
                ON DELETE CASCADE,

            FOREIGN KEY(from_continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE,

            FOREIGN KEY(to_continuity_id)
                REFERENCES CharacterContinuitiesV2(id)
                ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_asset_types_v2_guild
        ON AssetTypesV2(
            guild_id,
            is_archived,
            sort_order
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_continuity_assets_v2_owner
        ON ContinuityAssetsV2(
            guild_id,
            continuity_id,
            asset_type_id
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_continuity_asset_transfers_v2_asset
        ON ContinuityAssetTransfersV2(
            asset_id,
            created_at DESC
        )
    `).run();
}

module.exports =
    initializeAssetSchemaV2;
