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

    getRolePermissionAssignment(guildId, roleId, permissionKey) {
        this.assertRequired("guildId", guildId);
        this.assertRequired("roleId", roleId);
        this.assertKnownPermission(permissionKey);
        return repository.getRolePermissionAssignment(
            String(guildId), String(roleId), permissionKey
        );
    }

    setRolePermissionAssignment(data) {
        return repository.setRolePermissionAssignment({
            ...this.normalizeTargetedMutation(data, "roleId"),
            roleId: String(data.roleId),
            effect: this.validatedEffect(data.effect),
            updatedAt: this.nextMutationTimestamp(data.expected)
        });
    }

    clearRolePermissionAssignment(data) {
        return repository.clearRolePermissionAssignment({
            ...this.normalizeTargetedMutation(data, "roleId"),
            roleId: String(data.roleId)
        });
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

    getUserPermissionAssignment(guildId, discordUserId, permissionKey) {
        this.assertRequired("guildId", guildId);
        this.assertRequired("discordUserId", discordUserId);
        this.assertKnownPermission(permissionKey);
        return repository.getUserPermissionAssignment(
            String(guildId), String(discordUserId), permissionKey
        );
    }

    setUserPermissionAssignment(data) {
        return repository.setUserPermissionAssignment({
            ...this.normalizeTargetedMutation(data, "discordUserId"),
            discordUserId: String(data.discordUserId),
            effect: this.validatedEffect(data.effect),
            updatedAt: this.nextMutationTimestamp(data.expected)
        });
    }

    clearUserPermissionAssignment(data) {
        return repository.clearUserPermissionAssignment({
            ...this.normalizeTargetedMutation(data, "discordUserId"),
            discordUserId: String(data.discordUserId)
        });
    }

    getPermissionDefaults(guildId) {
        return repository.getPermissionDefaults(guildId);
    }

    getLegacyAssignmentDiagnostic(guildId) {
        this.assertRequired("guildId", guildId);
        const diagnostic = { roles: 0, users: 0, total: 0 };
        for (const row of repository.getAssignmentKeyCounts(String(guildId))) {
            if (catalog.has(row.permissionKey)) continue;
            if (row.subjectType === "role") diagnostic.roles += row.count;
            if (row.subjectType === "user") diagnostic.users += row.count;
            diagnostic.total += row.count;
        }
        return diagnostic;
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

    setPermissionDefaultOptimistic(data) {
        const normalized = this.normalizeTargetedMutation(data);
        return repository.setPermissionDefaultOptimistic({
            ...normalized,
            effect: this.validatedEffect(data.effect),
            updatedAt: this.nextMutationTimestamp(data.expected)
        });
    }

    clearPermissionDefaultOptimistic(data) {
        return repository.clearPermissionDefaultOptimistic(
            this.normalizeTargetedMutation(data)
        );
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

    normalizeTargetedMutation(data, subjectField = null) {
        if (!data || typeof data !== "object") {
            throw new TypeError("Mutation de permission invalide.");
        }
        this.assertRequired("guildId", data.guildId);
        if (subjectField) this.assertRequired(subjectField, data[subjectField]);
        this.assertRequired("actorId", data.actorId);
        this.assertKnownPermission(data.permissionKey);
        return {
            guildId: String(data.guildId),
            permissionKey: data.permissionKey,
            actorId: String(data.actorId),
            expected: this.normalizeExpected(data.expected)
        };
    }

    normalizeExpected(expected) {
        if (!expected || typeof expected !== "object"
            || typeof expected.present !== "boolean") {
            throw new TypeError("État attendu de permission invalide.");
        }
        if (!expected.present) return { present: false };
        if (expected.effect !== null) this.assertEffect(expected.effect);
        this.assertRequired("expected.updatedAt", expected.updatedAt);
        return {
            present: true,
            effect: expected.effect,
            updatedAt: String(expected.updatedAt)
        };
    }

    nextMutationTimestamp(expected) {
        const now = Date.now();
        const previous = expected?.present
            ? Date.parse(expected.updatedAt)
            : Number.NaN;
        return new Date(
            Number.isFinite(previous) && now <= previous ? previous + 1 : now
        ).toISOString();
    }

    validatedEffect(effect) {
        this.assertEffect(effect);
        return effect;
    }

    assertRequired(name, value) {
        if (value === null || value === undefined || !String(value).trim()) {
            throw new TypeError(`${name} est requis.`);
        }
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
