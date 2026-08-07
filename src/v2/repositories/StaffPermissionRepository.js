const db = require("../../database/database");

class StaffPermissionRepository {
    hasConfiguration(guildId) {
        return Boolean(db.prepare(`
            SELECT 1 FROM GuildStaffRolePermissionsV2
            WHERE guild_id = ? LIMIT 1
        `).get(guildId));
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
}

module.exports = new StaffPermissionRepository();
