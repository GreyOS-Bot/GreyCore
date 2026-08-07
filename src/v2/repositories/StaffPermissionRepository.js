const db = require("../../database/database");

class StaffPermissionRepository {
    hasConfiguration(guildId) {
        const roleConfigured = Boolean(db.prepare(`
            SELECT 1 FROM GuildStaffRolePermissionsV2
            WHERE guild_id = ? LIMIT 1
        `).get(guildId));
        const userConfigured = Boolean(db.prepare(`
            SELECT 1 FROM GuildStaffUserPermissionsV2
            WHERE guild_id = ? LIMIT 1
        `).get(guildId));
        return roleConfigured || userConfigured;
    }

    getRolePermissions(guildId, roleId) {
        return db.prepare(`
            SELECT permission_key
            FROM GuildStaffRolePermissionsV2
            WHERE guild_id = ? AND role_id = ?
            ORDER BY permission_key
        `).all(guildId, roleId).map(row => row.permission_key);
    }

    getPermissionsForRoles(guildId, roleIds) {
        if (!roleIds.length) return [];
        const placeholders = roleIds.map(() => "?").join(",");
        return db.prepare(`
            SELECT DISTINCT permission_key
            FROM GuildStaffRolePermissionsV2
            WHERE guild_id = ? AND role_id IN (${placeholders})
        `).all(guildId, ...roleIds).map(row => row.permission_key);
    }

    getUserPermissions(guildId, discordUserId) {
        return db.prepare(`
            SELECT permission_key
            FROM GuildStaffUserPermissionsV2
            WHERE guild_id = ? AND discord_user_id = ?
            ORDER BY permission_key
        `).all(guildId, discordUserId).map(row => row.permission_key);
    }

    getValidationChannelAccess(guildId) {
        const row = db.prepare(`
            SELECT validation_channel_grants_access
            FROM GuildStaffPermissionSettingsV2
            WHERE guild_id = ?
        `).get(guildId);
        return row ? Number(row.validation_channel_grants_access) === 1 : true;
    }

    setValidationChannelAccess({ guildId, enabled, updatedBy, updatedAt }) {
        db.prepare(`
            INSERT INTO GuildStaffPermissionSettingsV2 (
                guild_id, validation_channel_grants_access,
                updated_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(guild_id) DO UPDATE SET
                validation_channel_grants_access = excluded.validation_channel_grants_access,
                updated_by = excluded.updated_by,
                updated_at = excluded.updated_at
        `).run(guildId, enabled ? 1 : 0, updatedBy, updatedAt, updatedAt);
        return this.getValidationChannelAccess(guildId);
    }

    replaceRolePermissions({
        guildId,
        roleId,
        permissionKeys,
        grantedBy,
        updatedAt
    }) {
        const transaction = db.transaction(() => {
            db.prepare(`
                DELETE FROM GuildStaffRolePermissionsV2
                WHERE guild_id = ? AND role_id = ?
            `).run(guildId, roleId);

            const insert = db.prepare(`
                INSERT INTO GuildStaffRolePermissionsV2 (
                    guild_id, role_id, permission_key, granted_by,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const key of permissionKeys) {
                insert.run(
                    guildId,
                    roleId,
                    key,
                    grantedBy,
                    updatedAt,
                    updatedAt
                );
            }
        });
        transaction();
        return this.getRolePermissions(guildId, roleId);
    }


    replaceUserPermissions({
        guildId,
        discordUserId,
        permissionKeys,
        grantedBy,
        updatedAt
    }) {
        const transaction = db.transaction(() => {
            db.prepare(`
                DELETE FROM GuildStaffUserPermissionsV2
                WHERE guild_id = ? AND discord_user_id = ?
            `).run(guildId, discordUserId);
            const insert = db.prepare(`
                INSERT INTO GuildStaffUserPermissionsV2 (
                    guild_id, discord_user_id, permission_key,
                    granted_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const key of permissionKeys) {
                insert.run(
                    guildId,
                    discordUserId,
                    key,
                    grantedBy,
                    updatedAt,
                    updatedAt
                );
            }
        });
        transaction();
        return this.getUserPermissions(guildId, discordUserId);
    }
}

module.exports = new StaffPermissionRepository();
