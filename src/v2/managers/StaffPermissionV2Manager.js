const repository = require("../repositories/StaffPermissionRepository");
const catalog = require("../core/permissions/StaffPermissionCatalog");

class StaffPermissionV2Manager {
    getAssignments(guildId) {
        return repository.getAssignments(guildId);
    }

    getRolePermissions(guildId, roleId) {
        return repository.getRolePermissions(guildId, roleId);
    }

    getPermissionsForRoles(guildId, roleIds) {
        return repository.getPermissionsForRoles(
            guildId,
            [...new Set(roleIds.map(String))]
        );
    }

    getPermissionSourcesForRoles(guildId, roleIds) {
        return repository.getPermissionSourcesForRoles(
            guildId,
            [...new Set(roleIds.map(String))]
        );
    }

    getRolePermissionAssignments(guildId, roleId) {
        return repository.getRolePermissionAssignments(guildId, roleId);
    }

    getPermissionAssignmentsForRoles(guildId, roleIds) {
        return repository.getPermissionAssignmentsForRoles(
            guildId,
            [...new Set(roleIds.map(String))]
        );
    }

    getUserPermissions(guildId, discordUserId) {
        return repository.getUserPermissions(guildId, discordUserId);
    }

    getUserPermissionAssignments(guildId, discordUserId) {
        return repository.getUserPermissionAssignments(
            guildId,
            discordUserId
        );
    }

    getPermissionDefaults(guildId) {
        return repository.getPermissionDefaults(guildId);
    }

    getPermissionDefault(guildId, permissionKey) {
        this.assertKnownPermission(permissionKey);
        return repository.getPermissionDefault(guildId, permissionKey);
    }

    setPermissionDefault({ guildId, permissionKey, effect, updatedBy }) {
        this.assertKnownPermission(permissionKey);
        this.assertEffect(effect);
        return repository.setPermissionDefault({
            guildId,
            permissionKey,
            effect,
            updatedBy,
            updatedAt: new Date().toISOString()
        });
    }

    clearPermissionDefault(guildId, permissionKey) {
        this.assertKnownPermission(permissionKey);
        return repository.clearPermissionDefault(guildId, permissionKey);
    }

    getValidationChannelAccess(guildId) {
        return repository.getValidationChannelAccess(guildId);
    }

    setValidationChannelAccess({ guildId, enabled, updatedBy }) {
        return repository.setValidationChannelAccess({
            guildId,
            enabled,
            updatedBy,
            updatedAt: new Date().toISOString()
        });
    }

    hasConfiguration(guildId) {
        return repository.hasConfiguration(guildId);
    }

    replaceRolePermissions(data) {
        const permissionKeys = [...new Set(data.permissionKeys)]
            .filter(key => catalog.has(key));

        return repository.replaceRolePermissions({
            ...data,
            permissionKeys,
            updatedAt: new Date().toISOString()
        });
    }

    replaceRolePermissionAssignments(data) {
        return repository.replaceRolePermissionAssignments({
            ...data,
            assignments: this.normalizeAssignments(data.assignments),
            updatedAt: new Date().toISOString()
        });
    }

    replaceRolePermissionsForMany(data) {
        const roleIds = [...new Set(data.roleIds.map(String))];
        const permissionKeys = [...new Set(data.permissionKeys)]
            .filter(key => catalog.has(key));
        return repository.replaceRolePermissionsForMany({
            ...data,
            roleIds,
            permissionKeys,
            updatedAt: new Date().toISOString()
        });
    }

    replaceUserPermissions(data) {
        const permissionKeys = [...new Set(data.permissionKeys)]
            .filter(key => catalog.has(key));
        return repository.replaceUserPermissions({
            ...data,
            permissionKeys,
            updatedAt: new Date().toISOString()
        });
    }

    replaceUserPermissionAssignments(data) {
        return repository.replaceUserPermissionAssignments({
            ...data,
            assignments: this.normalizeAssignments(data.assignments),
            updatedAt: new Date().toISOString()
        });
    }

    replaceUserPermissionsForMany(data) {
        const discordUserIds = [...new Set(data.discordUserIds.map(String))];
        const permissionKeys = [...new Set(data.permissionKeys)]
            .filter(key => catalog.has(key));
        return repository.replaceUserPermissionsForMany({
            ...data,
            discordUserIds,
            permissionKeys,
            updatedAt: new Date().toISOString()
        });
    }


    normalizeAssignments(assignments) {
        if (!Array.isArray(assignments)) {
            throw new TypeError("assignments doit être un tableau.");
        }
        const normalized = [];
        const seen = new Set();
        for (const assignment of assignments) {
            const permissionKey = assignment?.permissionKey;
            const effect = assignment?.effect;
            this.assertKnownPermission(permissionKey);
            this.assertEffect(effect);
            if (seen.has(permissionKey)) {
                throw new Error(`Permission dupliquée : ${permissionKey}`);
            }
            seen.add(permissionKey);
            normalized.push({ permissionKey, effect });
        }
        return normalized;
    }

    assertKnownPermission(permissionKey) {
        if (!catalog.has(permissionKey)) {
            throw new Error(`Permission GreyCore inconnue : ${permissionKey}`);
        }
    }

    assertEffect(effect) {
        if (effect !== "allow" && effect !== "deny") {
            throw new Error(`Effet de permission invalide : ${effect}`);
        }
    }
}

module.exports = new StaffPermissionV2Manager();
