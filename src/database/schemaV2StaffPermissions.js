const db = require("./database");

function initializeStaffPermissionsSchemaV2() {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildStaffRolePermissionsV2 (
            guild_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            granted_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY(guild_id, role_id, permission_key),
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        )
    `).run();

    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_staff_role_permissions_guild
        ON GuildStaffRolePermissionsV2(guild_id, role_id)
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildStaffUserPermissionsV2 (
            guild_id TEXT NOT NULL,
            discord_user_id TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            granted_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY(guild_id, discord_user_id, permission_key),
            FOREIGN KEY(guild_id) REFERENCES Guilds(id) ON DELETE CASCADE
        )
    `).run();

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
}

module.exports = initializeStaffPermissionsSchemaV2;
