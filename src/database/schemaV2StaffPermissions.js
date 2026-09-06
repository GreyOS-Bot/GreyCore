const db = require("./database");

function initializeStaffPermissionsSchemaV2() {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildStaffRolePermissionsV2 (
            guild_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            effect TEXT CHECK (
                effect IS NULL OR effect IN ('allow', 'deny')
            ),
            granted_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY(guild_id, role_id, permission_key),
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        )
    `).run();

    ensureEffectColumn("GuildStaffRolePermissionsV2");

    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_staff_role_permissions_guild
        ON GuildStaffRolePermissionsV2(guild_id, role_id)
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildStaffUserPermissionsV2 (
            guild_id TEXT NOT NULL,
            discord_user_id TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            effect TEXT CHECK (
                effect IS NULL OR effect IN ('allow', 'deny')
            ),
            granted_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY(guild_id, discord_user_id, permission_key),
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        )
    `).run();

    ensureEffectColumn("GuildStaffUserPermissionsV2");

    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildStaffPermissionSettingsV2 (
            guild_id TEXT PRIMARY KEY,
            validation_channel_grants_access INTEGER NOT NULL DEFAULT 1,
            updated_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildStaffPermissionDefaultsV2 (
            guild_id TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
            updated_by TEXT,
            updated_at TEXT NOT NULL,
            PRIMARY KEY(guild_id, permission_key),
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        )
    `).run();
}

function ensureEffectColumn(tableName) {
    const columns = new Set(
        db.prepare(`PRAGMA table_info(${tableName})`)
            .all()
            .map(column => column.name)
    );
    if (!columns.has("effect")) {
        db.prepare(`
            ALTER TABLE ${tableName}
            ADD COLUMN effect TEXT CHECK (
                effect IS NULL OR effect IN ('allow', 'deny')
            )
        `).run();
    }
}

module.exports = initializeStaffPermissionsSchemaV2;
