const repository = require("../repositories/StaffPermissionRepository");
const catalog = require("../core/permissions/StaffPermissionCatalog");

class StaffPermissionV2Manager {
    getRolePermissions(guildId, roleId) {
        return repository.getRolePermissions(guildId, roleId);
    }

    getPermissionsForRoles(guildId, roleIds) {
        return repository.getPermissionsForRoles(
            guildId,
            [...new Set(roleIds.map(String))]
        );
    }

    getUserPermissions(guildId, discordUserId) {
        return repository.getUserPermissions(guildId, discordUserId);
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

    replaceUserPermissions(data) {
        const permissionKeys = [...new Set(data.permissionKeys)]
            .filter(key => catalog.has(key));
        return repository.replaceUserPermissions({
            ...data,
            permissionKeys,
            updatedAt: new Date().toISOString()
        });
    }
}

module.exports = new StaffPermissionV2Manager();
