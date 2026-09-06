const { PermissionFlagsBits } = require("discord.js");
const staffPermissionManager = require("../../managers/StaffPermissionV2Manager");
const guildSettingsManager = require("../../managers/GuildSettingsV2Manager");

const REASONS = Object.freeze({
    FLAG_DISABLED: "FLAG_DISABLED",
    NO_VALIDATION_CHANNEL: "NO_VALIDATION_CHANNEL",
    CHANNEL_NOT_CACHED: "CHANNEL_NOT_CACHED",
    MEMBER_UNAVAILABLE: "MEMBER_UNAVAILABLE",
    PERMISSIONS_UNAVAILABLE: "PERMISSIONS_UNAVAILABLE",
    NO_VIEW_CHANNEL: "NO_VIEW_CHANNEL",
    QUALIFIED: "QUALIFIED"
});

class ValidationBridgeQualificationService {
    qualify({ guild, member, guildId: providedGuildId } = {}) {
        const guildId = String(providedGuildId || guild?.id || "");
        const enabled = staffPermissionManager.getValidationChannelAccess(
            guildId
        );

        if (!enabled) {
            return this.result({
                enabled: false,
                qualified: false,
                guildId,
                channelId: null,
                reason: REASONS.FLAG_DISABLED
            });
        }

        const configuredChannelId = guildSettingsManager
            .getValidationChannelId(guildId);
        const channelId = configuredChannelId
            ? String(configuredChannelId)
            : null;

        if (!channelId) {
            return this.result({
                enabled: true,
                qualified: false,
                guildId,
                channelId: null,
                reason: REASONS.NO_VALIDATION_CHANNEL
            });
        }

        const channel = guild?.channels?.cache?.get?.(channelId) || null;
        if (!channel) {
            return this.result({
                enabled: true,
                qualified: false,
                guildId,
                channelId,
                reason: REASONS.CHANNEL_NOT_CACHED
            });
        }

        if (!member) {
            return this.result({
                enabled: true,
                qualified: false,
                guildId,
                channelId,
                reason: REASONS.MEMBER_UNAVAILABLE
            });
        }

        if (typeof channel.permissionsFor !== "function") {
            return this.result({
                enabled: true,
                qualified: false,
                guildId,
                channelId,
                reason: REASONS.PERMISSIONS_UNAVAILABLE
            });
        }

        let permissions;
        try {
            permissions = channel.permissionsFor(member);
        } catch {
            permissions = null;
        }
        if (!permissions || typeof permissions.has !== "function") {
            return this.result({
                enabled: true,
                qualified: false,
                guildId,
                channelId,
                reason: REASONS.PERMISSIONS_UNAVAILABLE
            });
        }

        const qualified = Boolean(
            permissions.has(PermissionFlagsBits.ViewChannel)
        );
        return this.result({
            enabled: true,
            qualified,
            guildId,
            channelId,
            reason: qualified
                ? REASONS.QUALIFIED
                : REASONS.NO_VIEW_CHANNEL
        });
    }

    result(value) {
        return Object.freeze({ ...value });
    }
}

const service = new ValidationBridgeQualificationService();
service.REASONS = REASONS;

module.exports = service;
