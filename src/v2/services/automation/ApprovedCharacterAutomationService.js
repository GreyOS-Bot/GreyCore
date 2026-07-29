const automationManager =
    require(
        "../../managers/CharacterApprovalAutomationV2Manager"
    );

const staffErrorLogService =
    require("../StaffErrorLogService");

const logger =
    require("../../core/services/TechnicalLogger")
        .create(
            "ApprovedCharacterAutomationService"
        );

class ApprovedCharacterAutomationService {

    constructor({
        manager = automationManager,
        errorLogService = staffErrorLogService,
        log = logger
    } = {}) {
        this.manager = manager;
        this.errorLogService = errorLogService;
        this.log = log;
    }

    async runAfterApproval({
        guild,
        playerId,
        characterName = null,
        interaction = null
    }) {
        const guildId = guild?.id || null;

        if (!guildId || !playerId) {
            return {
                triggered: false,
                reason: "missing_context"
            };
        }

        const configuration =
            this.manager.getConfiguration(guildId);

        if (
            !configuration
            || !configuration.is_enabled
        ) {
            return {
                triggered: false,
                reason: "disabled"
            };
        }

        const approvedCount =
            this.manager.countApprovedCharacters(
                guildId,
                playerId
            );

        if (
            approvedCount
            < configuration.approved_character_count
        ) {
            return {
                triggered: false,
                reason: "threshold_not_reached",
                approvedCount
            };
        }

        const existingRun =
            this.manager.getRun(
                guildId,
                playerId
            );

        if (
            existingRun?.status === "completed"
        ) {
            return {
                triggered: false,
                reason: "already_completed",
                approvedCount
            };
        }

        const needsMember = Boolean(
            configuration.required_role_id
            || configuration.remove_role_id
            || configuration.add_role_id
        );

        const member = needsMember
            ? await this.getMember(
                guild,
                playerId
            )
            : null;

        if (needsMember && !member) {
            return {
                triggered: false,
                reason: "member_not_found",
                approvedCount
            };
        }

        /*
         * Le rôle prérequis n'est vérifié que pour le premier passage.
         * Si GreyCore avait été interrompu après avoir retiré ce rôle,
         * une relance de la tâche peut finir proprement l'automatisation.
         */
        if (
            configuration.required_role_id
            && !existingRun
            && !memberHasRole(
                member,
                configuration.required_role_id
            )
        ) {
            return {
                triggered: false,
                reason: "required_role_missing",
                approvedCount
            };
        }

        const claimed =
            this.manager.claimRun({
                guildId,
                discordUserId: playerId,
                approvedCharacterCount: approvedCount
            });

        if (!claimed) {
            return {
                triggered: false,
                reason: "already_running",
                approvedCount
            };
        }

        const roleChanges = {
            removed: false,
            added: false
        };

        try {
            let welcomeChannel = null;

            if (configuration.welcome_channel_id) {
                welcomeChannel =
                    await this.getWelcomeChannel(
                        guild,
                        configuration.welcome_channel_id
                    );

                if (
                    !welcomeChannel
                    || typeof welcomeChannel.send !== "function"
                ) {
                    throw new Error(
                        "Le salon de bienvenue configuré est introuvable ou ne permet pas l’envoi de messages."
                    );
                }
            }

            if (
                configuration.remove_role_id
                &&
                memberHasRole(
                    member,
                    configuration.remove_role_id
                )
            ) {
                await member.roles.remove(
                    configuration.remove_role_id,
                    "GreyCore : personnages validés"
                );

                roleChanges.removed = true;
            }

            if (
                configuration.add_role_id
                &&
                !memberHasRole(
                    member,
                    configuration.add_role_id
                )
            ) {
                await member.roles.add(
                    configuration.add_role_id,
                    "GreyCore : personnages validés"
                );

                roleChanges.added = true;
            }

            if (configuration.welcome_channel_id) {
                await welcomeChannel.send({
                    content: formatWelcomeMessage({
                        template:
                            configuration.welcome_message,
                        playerId,
                        playerName:
                            member?.displayName
                            || member?.user?.globalName
                            || member?.user?.username
                            || playerId,
                        guildName:
                            guild.name
                            || "ce serveur",
                        approvedCount,
                        characterName
                    }),
                    allowedMentions: {
                        users: [playerId],
                        parse: []
                    }
                });
            }

            this.manager.completeRun({
                guildId,
                discordUserId: playerId
            });

            return {
                triggered: true,
                approvedCount
            };
        } catch (error) {
            await this.rollbackRoles({
                member,
                configuration,
                roleChanges
            });

            this.manager.releaseRun(
                guildId,
                playerId
            );

            this.log.error(
                "Automatisation après validation impossible :",
                error
            );

            try {
                await this.errorLogService.report({
                    guildId,
                    scope:
                        "Automatisation après validation",
                    error,
                    interaction
                });
            } catch (reportError) {
                this.log.warn(
                    "Impossible de signaler l’échec de l’automatisation au staff :",
                    reportError
                );
            }

            return {
                triggered: false,
                reason: "failed",
                approvedCount
            };
        }
    }

    async getMember(guild, playerId) {
        const cached =
            guild.members?.cache?.get(
                String(playerId)
            );

        if (cached) {
            return cached;
        }

        if (
            typeof guild.members?.fetch !== "function"
        ) {
            return null;
        }

        return guild.members.fetch(
            playerId
        )
            .catch(
                () => null
            );
    }

    async getWelcomeChannel(guild, channelId) {
        const cached =
            guild.channels?.cache?.get(
                String(channelId)
            );

        if (cached) {
            return cached;
        }

        if (
            typeof guild.channels?.fetch !== "function"
        ) {
            return null;
        }

        return guild.channels.fetch(
            channelId
        )
            .catch(
                () => null
            );
    }

    async rollbackRoles({
        member,
        configuration,
        roleChanges
    }) {
        try {
            if (roleChanges.added && member) {
                await member.roles.remove(
                    configuration.add_role_id,
                    "GreyCore : annulation d’une automatisation incomplète"
                );
            }

            if (roleChanges.removed && member) {
                await member.roles.add(
                    configuration.remove_role_id,
                    "GreyCore : annulation d’une automatisation incomplète"
                );
            }
        } catch (rollbackError) {
            this.log.warn(
                "Impossible de restaurer les rôles après l’échec de l’automatisation :",
                rollbackError
            );
        }
    }

}

function memberHasRole(member, roleId) {
    return Boolean(
        roleId
        && member?.roles?.cache?.has(
            String(roleId)
        )
    );
}

function formatWelcomeMessage({
    template,
    playerId,
    playerName,
    guildName,
    approvedCount,
    characterName
}) {
    return String(template)
        .replaceAll("{user}", `<@${playerId}>`)
        .replaceAll("{utilisateur}", `<@${playerId}>`)
        .replaceAll("{username}", playerName)
        .replaceAll("{pseudo}", playerName)
        .replaceAll("{server}", guildName)
        .replaceAll("{serveur}", guildName)
        .replaceAll("{count}", String(approvedCount))
        .replaceAll("{personnages}", String(approvedCount))
        .replaceAll(
            "{character}",
            characterName || "ton personnage"
        )
        .replaceAll(
            "{personnage}",
            characterName || "ton personnage"
        );
}

const service =
    new ApprovedCharacterAutomationService();

module.exports = service;
module.exports.ApprovedCharacterAutomationService =
    ApprovedCharacterAutomationService;
module.exports.formatWelcomeMessage =
    formatWelcomeMessage;
