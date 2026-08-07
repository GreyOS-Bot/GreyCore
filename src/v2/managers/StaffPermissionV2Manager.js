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
}

module.exports = new StaffPermissionV2Manager();
