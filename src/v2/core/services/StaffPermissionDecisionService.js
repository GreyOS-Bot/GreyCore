const { PermissionFlagsBits } = require("discord.js");
const manager = require("../../managers/StaffPermissionV2Manager");
const catalog = require("../permissions/StaffPermissionCatalog");
const validationStaffPolicy = require("../policies/ValidationStaffPolicy");

const REASONS = Object.freeze({
    GUILD_OWNER: "GUILD_OWNER",
    DISCORD_ADMINISTRATOR: "DISCORD_ADMINISTRATOR",
    ROLE_PERMISSION: "ROLE_PERMISSION",
    USER_PERMISSION: "USER_PERMISSION",
    VALIDATION_LEGACY_ACCESS: "VALIDATION_LEGACY_ACCESS",
    READ_ONLY: "READ_ONLY",
    LEGACY_READ_ONLY_UNKNOWN_PERMISSION:
        "LEGACY_READ_ONLY_UNKNOWN_PERMISSION",
    LEGACY_VALIDATION_UNKNOWN_PERMISSION:
        "LEGACY_VALIDATION_UNKNOWN_PERMISSION",
    LEGACY_ROLE_UNKNOWN_PERMISSION:
        "LEGACY_ROLE_UNKNOWN_PERMISSION",
    LEGACY_USER_UNKNOWN_PERMISSION:
        "LEGACY_USER_UNKNOWN_PERMISSION",
    LEGACY_STORED_WILDCARD_PERMISSION:
        "LEGACY_STORED_WILDCARD_PERMISSION",
    NO_PERMISSION: "NO_PERMISSION"
});

class StaffPermissionDecisionService {
    decide({
        interaction: providedInteraction,
        guild,
        member,
        userId,
        permission,
        write = false,
        legacyCanAccessParity = false
    }) {
        const interaction = providedInteraction || {
            guild,
            guildId: guild?.id,
            member,
            user: userId ? { id: String(userId) } : null
        };
        const resolvedGuild = guild || interaction.guild;
        const resolvedMember = member || interaction.member;
        const resolvedUserId = String(
            userId || interaction.user?.id || resolvedMember?.user?.id || ""
        );
        const guildId = String(
            interaction.guildId || resolvedGuild?.id || ""
        );
        const mode = write ? "write" : "read";

        if (
            resolvedGuild?.ownerId
            && resolvedUserId === String(resolvedGuild.ownerId)
        ) {
            return this.createDecision({
                allowed: true,
                permission,
                mode,
                reason: REASONS.GUILD_OWNER,
                sources: [{ type: "GUILD_OWNER", userId: resolvedUserId }]
            });
        }

        if (this.isAdministrator(interaction, resolvedMember)) {
            return this.createDecision({
                allowed: true,
                permission,
                mode,
                reason: REASONS.DISCORD_ADMINISTRATOR,
                sources: [{
                    type: "DISCORD_ADMINISTRATOR",
                    userId: resolvedUserId || null
                }]
            });
        }

        const knownPermission = this.isKnownPermission(permission);
        if ((!knownPermission && !legacyCanAccessParity) || !guildId) {
            return this.denied(permission, mode);
        }

        const roleIds = this.getRoleIds(resolvedMember);
        const roleRows = manager.getPermissionSourcesForRoles(
            guildId,
            roleIds
        );
        const userPermissions = resolvedUserId
            ? manager.getUserPermissions(guildId, resolvedUserId)
            : [];
        const validationLegacyAccess = Boolean(
            manager.getValidationChannelAccess(guildId)
            && validationStaffPolicy.canManageServerTools(interaction)
        );

        if (legacyCanAccessParity) {
            return this.decideWithLegacyCanAccessParity({
                guildId,
                resolvedUserId,
                permission,
                mode,
                write,
                knownPermission,
                roleRows,
                userPermissions,
                validationLegacyAccess
            });
        }

        const roleSources = roleRows
            .filter(row => row.permission_key === permission)
            .map(row => ({
                type: "ROLE_PERMISSION",
                roleId: String(row.role_id),
                permission: row.permission_key
            }));
        const userSources = userPermissions.includes(permission)
            ? [{
                type: "USER_PERMISSION",
                userId: resolvedUserId,
                permission
            }]
            : [];

        if (roleSources.length || userSources.length) {
            return this.createDecision({
                allowed: true,
                permission,
                mode,
                reason: roleSources.length
                    ? REASONS.ROLE_PERMISSION
                    : REASONS.USER_PERMISSION,
                sources: [...roleSources, ...userSources]
            });
        }

        if (validationLegacyAccess) {
            return this.createDecision({
                allowed: true,
                permission,
                mode,
                reason: REASONS.VALIDATION_LEGACY_ACCESS,
                sources: [{
                    type: "VALIDATION_LEGACY_ACCESS",
                    guildId
                }]
            });
        }

        if (!write) {
            const readOnlyRoleSources = roleRows
                .filter(row => row.permission_key === "read_only")
                .map(row => ({
                    type: "ROLE_PERMISSION",
                    roleId: String(row.role_id),
                    permission: "read_only"
                }));
            const readOnlyUserSources = userPermissions.includes("read_only")
                ? [{
                    type: "USER_PERMISSION",
                    userId: resolvedUserId,
                    permission: "read_only"
                }]
                : [];
            const readOnlySources = [
                ...readOnlyRoleSources,
                ...readOnlyUserSources
            ];
            if (readOnlySources.length) {
                return this.createDecision({
                    allowed: true,
                    permission,
                    mode,
                    reason: REASONS.READ_ONLY,
                    sources: readOnlySources
                });
            }
        }

        return this.denied(permission, mode);
    }

    decideWithLegacyCanAccessParity({
        guildId,
        resolvedUserId,
        permission,
        mode,
        write,
        knownPermission,
        roleRows,
        userPermissions,
        validationLegacyAccess
    }) {
        const validationSources = validationLegacyAccess
            ? [{
                type: "VALIDATION_LEGACY_ACCESS",
                guildId,
                permission: "*"
            }]
            : [];
        const storedWildcardSources = [
            ...roleRows
                .filter(row => row.permission_key === "*")
                .map(row => ({
                    type: "ROLE_PERMISSION",
                    roleId: String(row.role_id),
                    permission: "*",
                    compatibility: "legacy"
                })),
            ...(userPermissions.includes("*") ? [{
                type: "USER_PERMISSION",
                userId: resolvedUserId,
                permission: "*",
                compatibility: "legacy"
            }] : [])
        ];
        const exactRoleSources = roleRows
            .filter(row => row.permission_key === permission)
            .map(row => ({
                type: "ROLE_PERMISSION",
                roleId: String(row.role_id),
                permission: row.permission_key,
                ...(!knownPermission && { compatibility: "legacy" })
            }));
        const exactUserSources = userPermissions.includes(permission)
            ? [{
                type: "USER_PERMISSION",
                userId: resolvedUserId,
                permission,
                ...(!knownPermission && { compatibility: "legacy" })
            }]
            : [];
        const readOnlySources = !write
            ? [
                ...roleRows
                    .filter(row => row.permission_key === "read_only")
                    .map(row => ({
                        type: "ROLE_PERMISSION",
                        roleId: String(row.role_id),
                        permission: "read_only",
                        ...(!knownPermission && {
                            compatibility: "legacy"
                        })
                    })),
                ...(userPermissions.includes("read_only") ? [{
                    type: "USER_PERMISSION",
                    userId: resolvedUserId,
                    permission: "read_only",
                    ...(!knownPermission && { compatibility: "legacy" })
                }] : [])
            ]
            : [];
        const sources = [
            ...validationSources,
            ...storedWildcardSources,
            ...exactRoleSources,
            ...exactUserSources,
            ...readOnlySources
        ];

        let reason = null;
        if (validationSources.length) {
            reason = knownPermission
                ? REASONS.VALIDATION_LEGACY_ACCESS
                : REASONS.LEGACY_VALIDATION_UNKNOWN_PERMISSION;
        } else if (storedWildcardSources.length) {
            reason = REASONS.LEGACY_STORED_WILDCARD_PERMISSION;
        } else if (exactRoleSources.length) {
            reason = knownPermission
                ? REASONS.ROLE_PERMISSION
                : REASONS.LEGACY_ROLE_UNKNOWN_PERMISSION;
        } else if (exactUserSources.length) {
            reason = knownPermission
                ? REASONS.USER_PERMISSION
                : REASONS.LEGACY_USER_UNKNOWN_PERMISSION;
        } else if (readOnlySources.length) {
            reason = knownPermission
                ? REASONS.READ_ONLY
                : REASONS.LEGACY_READ_ONLY_UNKNOWN_PERMISSION;
        }

        if (!reason) {
            return this.denied(permission, mode);
        }

        return this.createDecision({
            allowed: true,
            permission,
            mode,
            reason,
            sources
        });
    }

    isKnownPermission(permission) {
        return permission === "*" || catalog.has(permission);
    }

    isAdministrator(interaction, member) {
        return Boolean(
            interaction.memberPermissions?.has?.(
                PermissionFlagsBits.Administrator
            )
            || member?.permissions?.has?.(
                PermissionFlagsBits.Administrator
            )
        );
    }

    getRoleIds(member) {
        const cache = member?.roles?.cache;
        if (cache?.keys) {
            return [...cache.keys()].map(String).sort();
        }
        if (Array.isArray(member?.roles)) {
            return member.roles.map(String).sort();
        }
        return [];
    }

    createDecision({ allowed, permission, mode, reason, sources }) {
        return Object.freeze({
            allowed,
            permission,
            mode,
            reason,
            sources: Object.freeze(sources.map(source => Object.freeze(source)))
        });
    }

    denied(permission, mode) {
        return this.createDecision({
            allowed: false,
            permission,
            mode,
            reason: REASONS.NO_PERMISSION,
            sources: []
        });
    }
}

module.exports = new StaffPermissionDecisionService();
module.exports.REASONS = REASONS;
