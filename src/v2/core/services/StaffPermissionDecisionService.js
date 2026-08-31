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
    USER_DENY: "USER_DENY",
    USER_ALLOW: "USER_ALLOW",
    ROLE_DENY: "ROLE_DENY",
    ROLE_ALLOW: "ROLE_ALLOW",
    GUILD_DEFAULT_DENY: "GUILD_DEFAULT_DENY",
    GUILD_DEFAULT_ALLOW: "GUILD_DEFAULT_ALLOW",
    READ_ONLY_DENY: "READ_ONLY_DENY",
    UNKNOWN_PERMISSION: "UNKNOWN_PERMISSION",
    IMPLICIT_DENY: "IMPLICIT_DENY",
    NO_PERMISSION: "NO_PERMISSION"
});

class StaffPermissionDecisionService {
    decide(options) {
        return this.decideMany({
            ...options,
            requests: [{
                permission: options.permission,
                write: options.write === true
            }]
        }).decisions[0];
    }

    decideMany({
        interaction: providedInteraction,
        guild,
        member,
        userId,
        requests = [],
        legacyCanAccessParity = false
    }) {
        const normalizedRequests = requests.map(request => ({
            permission: request?.permission,
            write: request?.write === true
        }));
        if (legacyCanAccessParity !== true) {
            const strictSnapshot = this.resolveStrictSnapshot({
                interaction: providedInteraction,
                guild,
                member,
                userId
            });
            return Object.freeze({
                decisions: Object.freeze(normalizedRequests.map(request =>
                    this.evaluateStrictPermission(strictSnapshot, request)
                ))
            });
        }
        const includeSources = legacyCanAccessParity
            || normalizedRequests.some(request =>
                this.isKnownPermission(request.permission)
            );
        const snapshot = this.resolvePermissionSnapshot({
            interaction: providedInteraction,
            guild,
            member,
            userId
        }, includeSources);

        if (snapshot.rootReason) {
            return this.createDecisionBatch(normalizedRequests, request => ({
                reason: snapshot.rootReason,
                sources: snapshot.rootSources
            }));
        }
        if (!snapshot.sourcesResolved) {
            return Object.freeze({
                decisions: Object.freeze(normalizedRequests.map(request =>
                    this.denied(
                        request.permission,
                        request.write ? "write" : "read"
                    )
                ))
            });
        }
        return Object.freeze({
            decisions: Object.freeze(normalizedRequests.map(request =>
                this.evaluate(snapshot, request, legacyCanAccessParity)
            ))
        });
    }

    getGrantedPermissions(options) {
        const snapshot = this.resolvePermissionSnapshot(options, true);
        if (snapshot.rootReason) return ["*"];
        if (!snapshot.sourcesResolved) return [];
        const permissions = new Set(
            snapshot.roleRows.map(row => row.permission_key)
        );
        for (const permission of snapshot.userPermissions) {
            permissions.add(permission);
        }
        if (snapshot.validationLegacyAccess) permissions.add("*");
        return [...permissions];
    }

    resolveStrictSnapshot({
        interaction: providedInteraction,
        guild,
        member,
        userId
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
        let rootReason = null;
        let rootSources = [];
        if (
            resolvedGuild?.ownerId
            && resolvedUserId === String(resolvedGuild.ownerId)
        ) {
            rootReason = REASONS.GUILD_OWNER;
            rootSources = [{ type: "GUILD_OWNER" }];
        } else if (this.isAdministrator(interaction, resolvedMember)) {
            rootReason = REASONS.DISCORD_ADMINISTRATOR;
            rootSources = [{ type: "DISCORD_ADMINISTRATOR" }];
        }

        if (rootReason || !guildId) {
            return this.createStrictSnapshot({
                guildId,
                resolvedUserId,
                rootReason,
                rootSources,
                roleAssignments: [],
                userAssignments: [],
                defaults: []
            });
        }

        return this.createStrictSnapshot({
            guildId,
            resolvedUserId,
            rootReason: null,
            rootSources: [],
            roleAssignments: manager.getPermissionAssignmentsForRoles(
                guildId,
                this.getRoleIds(resolvedMember)
            ),
            userAssignments: resolvedUserId
                ? manager.getUserPermissionAssignments(
                    guildId,
                    resolvedUserId
                )
                : [],
            defaults: manager.getPermissionDefaults(guildId)
        });
    }

    evaluateStrictPermission(snapshot, { permission, write = false }) {
        const mode = write === true ? "write" : "read";
        if (snapshot.rootReason) {
            return this.createDecision({
                allowed: true,
                permission,
                mode,
                reason: snapshot.rootReason,
                sources: snapshot.rootSources
            });
        }
        if (!catalog.has(permission)) {
            return this.createDecision({
                allowed: false,
                permission,
                mode,
                reason: REASONS.UNKNOWN_PERMISSION,
                sources: []
            });
        }

        const specific = this.evaluateStrictAssignment(snapshot, permission);
        if (specific) {
            return this.createDecision({
                allowed: specific.allowed,
                permission,
                mode,
                reason: specific.reason,
                sources: specific.sources
            });
        }

        if (write !== true && permission !== "read_only") {
            const readOnly = this.evaluateStrictAssignment(
                snapshot,
                "read_only"
            );
            if (readOnly) {
                return this.createDecision({
                    allowed: readOnly.allowed,
                    permission,
                    mode,
                    reason: readOnly.allowed
                        ? REASONS.READ_ONLY
                        : REASONS.READ_ONLY_DENY,
                    sources: readOnly.sources.map(source => ({
                        ...source,
                        type: "READ_ONLY"
                    }))
                });
            }
        }

        return this.createDecision({
            allowed: false,
            permission,
            mode,
            reason: REASONS.IMPLICIT_DENY,
            sources: []
        });
    }

    createStrictSnapshot({
        guildId,
        resolvedUserId,
        rootReason,
        rootSources,
        roleAssignments,
        userAssignments,
        defaults
    }) {
        const normalizedRoles = roleAssignments
            .map(assignment => ({
                roleId: String(assignment.roleId),
                permission: assignment.permissionKey,
                effect: assignment.effect
            }))
            .sort((left, right) =>
                left.roleId.localeCompare(right.roleId)
                || String(left.permission).localeCompare(
                    String(right.permission)
                )
            );
        const normalizedUsers = userAssignments
            .map(assignment => ({
                permission: assignment.permissionKey,
                effect: assignment.effect
            }))
            .sort((left, right) =>
                String(left.permission).localeCompare(String(right.permission))
            );
        const normalizedDefaults = defaults
            .map(assignment => ({
                permission: assignment.permissionKey,
                effect: assignment.effect
            }))
            .sort((left, right) =>
                String(left.permission).localeCompare(String(right.permission))
            );

        return Object.freeze({
            guildId,
            resolvedUserId,
            rootReason,
            rootSources: this.freezeSources(rootSources),
            userAssignmentsByPermission: this.indexStrictAssignments(
                normalizedUsers
            ),
            roleAssignmentsByPermission: this.indexStrictAssignments(
                normalizedRoles,
                true
            ),
            defaultsByPermission: this.indexStrictAssignments(
                normalizedDefaults
            )
        });
    }

    indexStrictAssignments(assignments, grouped = false) {
        const index = Object.create(null);
        for (const assignment of assignments) {
            const frozen = Object.freeze({ ...assignment });
            if (grouped) {
                if (!index[assignment.permission]) {
                    index[assignment.permission] = [];
                }
                index[assignment.permission].push(frozen);
            } else {
                index[assignment.permission] = frozen;
            }
        }
        if (grouped) {
            for (const permission of Object.keys(index)) {
                index[permission] = Object.freeze(index[permission]);
            }
        }
        return Object.freeze(index);
    }

    evaluateStrictAssignment(snapshot, permission) {
        const user = snapshot.userAssignmentsByPermission[permission];
        if (user) {
            const allowed = user.effect !== "deny";
            return {
                allowed,
                reason: allowed ? REASONS.USER_ALLOW : REASONS.USER_DENY,
                sources: [this.createStrictSource("USER_PERMISSION", user)]
            };
        }

        const roles = snapshot.roleAssignmentsByPermission[permission] || [];
        const deniedRoles = roles.filter(role => role.effect === "deny");
        const winningRoles = deniedRoles.length ? deniedRoles : roles;
        if (winningRoles.length) {
            return {
                allowed: deniedRoles.length === 0,
                reason: deniedRoles.length
                    ? REASONS.ROLE_DENY
                    : REASONS.ROLE_ALLOW,
                sources: winningRoles.map(role =>
                    this.createStrictSource("ROLE_PERMISSION", role)
                )
            };
        }

        const defaultAssignment = snapshot.defaultsByPermission[permission];
        if (defaultAssignment) {
            const allowed = defaultAssignment.effect === "allow";
            return {
                allowed,
                reason: allowed
                    ? REASONS.GUILD_DEFAULT_ALLOW
                    : REASONS.GUILD_DEFAULT_DENY,
                sources: [this.createStrictSource(
                    "GUILD_DEFAULT",
                    defaultAssignment
                )]
            };
        }
        return null;
    }

    createStrictSource(type, assignment) {
        return {
            type,
            permission: assignment.permission,
            effect: assignment.effect,
            legacy: assignment.effect === null,
            ...(assignment.roleId ? { roleId: assignment.roleId } : {})
        };
    }

    freezeSources(sources) {
        return Object.freeze(sources.map(source => Object.freeze({ ...source })));
    }

    resolvePermissionSnapshot({
        interaction: providedInteraction,
        guild,
        member,
        userId
    }, includeSources) {
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
        let rootReason = null;
        let rootSources = [];
        if (
            resolvedGuild?.ownerId
            && resolvedUserId === String(resolvedGuild.ownerId)
        ) {
            rootReason = REASONS.GUILD_OWNER;
            rootSources = [{ type: "GUILD_OWNER", userId: resolvedUserId }];
        } else if (this.isAdministrator(interaction, resolvedMember)) {
            rootReason = REASONS.DISCORD_ADMINISTRATOR;
            rootSources = [{
                type: "DISCORD_ADMINISTRATOR",
                userId: resolvedUserId || null
            }];
        }
        if (rootReason || !guildId || !includeSources) {
            return Object.freeze({
                guildId,
                resolvedUserId,
                rootReason,
                rootSources: Object.freeze(rootSources.map(source =>
                    Object.freeze(source)
                )),
                roleRows: Object.freeze([]),
                userPermissions: Object.freeze([]),
                validationLegacyAccess: false,
                sourcesResolved: false
            });
        }

        const roleRows = manager.getPermissionSourcesForRoles(
            guildId,
            this.getRoleIds(resolvedMember)
        );
        const userPermissions = resolvedUserId
            ? manager.getUserPermissions(guildId, resolvedUserId)
            : [];
        const validationLegacyAccess = Boolean(
            manager.getValidationChannelAccess(guildId)
            && validationStaffPolicy.canManageServerTools(interaction)
        );
        return Object.freeze({
            guildId,
            resolvedUserId,
            rootReason: null,
            rootSources: Object.freeze([]),
            roleRows: Object.freeze(roleRows
                .map(row => ({
                    role_id: String(row.role_id),
                    permission_key: row.permission_key
                }))
                .sort((left, right) =>
                    left.role_id.localeCompare(right.role_id)
                    || String(left.permission_key).localeCompare(
                        String(right.permission_key)
                    )
                )
                .map(row => Object.freeze(row))),
            userPermissions: Object.freeze(
                [...new Set(userPermissions)].sort((left, right) =>
                    String(left).localeCompare(String(right))
                )
            ),
            validationLegacyAccess,
            sourcesResolved: true
        });
    }

    evaluate(snapshot, { permission, write }, legacyCanAccessParity) {
        const mode = write ? "write" : "read";
        const knownPermission = this.isKnownPermission(permission);
        if (!knownPermission && !legacyCanAccessParity) {
            return this.denied(permission, mode);
        }
        const {
            guildId,
            resolvedUserId,
            roleRows,
            userPermissions,
            validationLegacyAccess
        } = snapshot;

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

    createDecisionBatch(requests, resolveRoot) {
        return Object.freeze({
            decisions: Object.freeze(requests.map(request => {
                const root = resolveRoot(request);
                return this.createDecision({
                    allowed: true,
                    permission: request.permission,
                    mode: request.write ? "write" : "read",
                    reason: root.reason,
                    sources: root.sources
                });
            }))
        });
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
