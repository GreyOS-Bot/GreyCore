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
    NO_PERMISSION: "NO_PERMISSION"
});

class StaffPermissionDecisionService {
    decide({
        interaction: providedInteraction,
        guild,
        member,
        userId,
        permission,
        write = false
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

        if (!this.isKnownPermission(permission) || !guildId) {
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
