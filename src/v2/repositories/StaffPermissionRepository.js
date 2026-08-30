const db = require("../../database/database");

class StaffPermissionRepository {
    getAssignments(guildId) {
        return {
            roles: db.prepare(`
                SELECT role_id, GROUP_CONCAT(permission_key) AS permission_keys
                FROM GuildStaffRolePermissionsV2
                WHERE guild_id = ?
                GROUP BY role_id
                ORDER BY role_id
            `).all(guildId),
            users: db.prepare(`
                SELECT discord_user_id, GROUP_CONCAT(permission_key) AS permission_keys
                FROM GuildStaffUserPermissionsV2
                WHERE guild_id = ?
                GROUP BY discord_user_id
                ORDER BY discord_user_id
            `).all(guildId)
        };
    }

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

    getPermissionSourcesForRoles(guildId, roleIds) {
        if (!roleIds.length) return [];
        const placeholders = roleIds.map(() => "?").join(",");
        return db.prepare(`
            SELECT role_id, permission_key
            FROM GuildStaffRolePermissionsV2
            WHERE guild_id = ? AND role_id IN (${placeholders})
            ORDER BY role_id, permission_key
        `).all(guildId, ...roleIds);
    }

    getRolePermissionAssignments(guildId, roleId) {
        return db.prepare(`
            SELECT role_id, permission_key, effect
            FROM GuildStaffRolePermissionsV2
            WHERE guild_id = ? AND role_id = ?
            ORDER BY permission_key
        `).all(guildId, roleId).map(mapRoleAssignment);
    }

    getPermissionAssignmentsForRoles(guildId, roleIds) {
        if (!roleIds.length) return [];
        const placeholders = roleIds.map(() => "?").join(",");
        return db.prepare(`
            SELECT role_id, permission_key, effect
            FROM GuildStaffRolePermissionsV2
            WHERE guild_id = ? AND role_id IN (${placeholders})
            ORDER BY role_id, permission_key
        `).all(guildId, ...roleIds).map(mapRoleAssignment);
    }

    getUserPermissions(guildId, discordUserId) {
        return db.prepare(`
            SELECT permission_key
            FROM GuildStaffUserPermissionsV2
            WHERE guild_id = ? AND discord_user_id = ?
            ORDER BY permission_key
        `).all(guildId, discordUserId).map(row => row.permission_key);
    }

    getUserPermissionAssignments(guildId, discordUserId) {
        return db.prepare(`
            SELECT permission_key, effect
            FROM GuildStaffUserPermissionsV2
            WHERE guild_id = ? AND discord_user_id = ?
            ORDER BY permission_key
        `).all(guildId, discordUserId).map(row => ({
            permissionKey: row.permission_key,
            effect: row.effect
        }));
    }

    getPermissionDefaults(guildId) {
        return db.prepare(`
            SELECT permission_key, effect, updated_by, updated_at
            FROM GuildStaffPermissionDefaultsV2
            WHERE guild_id = ?
            ORDER BY permission_key
        `).all(guildId).map(mapDefaultAssignment);
    }

    getPermissionDefault(guildId, permissionKey) {
        const row = db.prepare(`
            SELECT permission_key, effect, updated_by, updated_at
            FROM GuildStaffPermissionDefaultsV2
            WHERE guild_id = ? AND permission_key = ?
        `).get(guildId, permissionKey);
        return row ? mapDefaultAssignment(row) : null;
    }

    setPermissionDefault({
        guildId, permissionKey, effect, updatedBy, updatedAt
    }) {
        db.prepare(`
            INSERT INTO GuildStaffPermissionDefaultsV2 (
                guild_id, permission_key, effect, updated_by, updated_at
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(guild_id, permission_key) DO UPDATE SET
                effect = excluded.effect,
                updated_by = excluded.updated_by,
                updated_at = excluded.updated_at
        `).run(guildId, permissionKey, effect, updatedBy, updatedAt);
        return this.getPermissionDefault(guildId, permissionKey);
    }

    clearPermissionDefault(guildId, permissionKey) {
        return db.prepare(`
            DELETE FROM GuildStaffPermissionDefaultsV2
            WHERE guild_id = ? AND permission_key = ?
        `).run(guildId, permissionKey).changes > 0;
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
                    guild_id, role_id, permission_key, effect, granted_by,
                    created_at, updated_at
                ) VALUES (?, ?, ?, 'allow', ?, ?, ?)
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

    replaceRolePermissionAssignments({
        guildId, roleId, assignments, grantedBy, updatedAt
    }) {
        const transaction = db.transaction(() => {
            db.prepare(`
                DELETE FROM GuildStaffRolePermissionsV2
                WHERE guild_id = ? AND role_id = ?
            `).run(guildId, roleId);
            const insert = db.prepare(`
                INSERT INTO GuildStaffRolePermissionsV2 (
                    guild_id, role_id, permission_key, effect, granted_by,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            for (const assignment of assignments) {
                insert.run(
                    guildId, roleId, assignment.permissionKey,
                    assignment.effect, grantedBy, updatedAt, updatedAt
                );
            }
        });
        transaction();
        return this.getRolePermissionAssignments(guildId, roleId);
    }

    replaceRolePermissionsForMany({
        guildId, roleIds, permissionKeys, grantedBy, updatedAt
    }) {
        const replace = db.transaction(() => {
            for (const roleId of roleIds) {
                this.replaceRolePermissions({
                    guildId, roleId, permissionKeys, grantedBy, updatedAt
                });
            }
        });
        replace();
        return roleIds.map(roleId => ({
            subjectId: roleId,
            permissionKeys: this.getRolePermissions(guildId, roleId)
        }));
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
                    guild_id, discord_user_id, permission_key, effect,
                    granted_by, created_at, updated_at
                ) VALUES (?, ?, ?, 'allow', ?, ?, ?)
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

    replaceUserPermissionAssignments({
        guildId, discordUserId, assignments, grantedBy, updatedAt
    }) {
        const transaction = db.transaction(() => {
            db.prepare(`
                DELETE FROM GuildStaffUserPermissionsV2
                WHERE guild_id = ? AND discord_user_id = ?
            `).run(guildId, discordUserId);
            const insert = db.prepare(`
                INSERT INTO GuildStaffUserPermissionsV2 (
                    guild_id, discord_user_id, permission_key, effect,
                    granted_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            for (const assignment of assignments) {
                insert.run(
                    guildId, discordUserId, assignment.permissionKey,
                    assignment.effect, grantedBy, updatedAt, updatedAt
                );
            }
        });
        transaction();
        return this.getUserPermissionAssignments(guildId, discordUserId);
    }

    replaceUserPermissionsForMany({
        guildId, discordUserIds, permissionKeys, grantedBy, updatedAt
    }) {
        const replace = db.transaction(() => {
            for (const discordUserId of discordUserIds) {
                this.replaceUserPermissions({
                    guildId, discordUserId, permissionKeys, grantedBy, updatedAt
                });
            }
        });
        replace();
        return discordUserIds.map(discordUserId => ({
            subjectId: discordUserId,
            permissionKeys: this.getUserPermissions(guildId, discordUserId)
        }));
    }
}

function mapRoleAssignment(row) {
    return {
        roleId: String(row.role_id),
        permissionKey: row.permission_key,
        effect: row.effect
    };
}

function mapDefaultAssignment(row) {
    return {
        permissionKey: row.permission_key,
        effect: row.effect,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at
    };
}

module.exports = new StaffPermissionRepository();
