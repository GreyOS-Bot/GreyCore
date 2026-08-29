const {
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

const CHANNEL_ERROR_KINDS = Object.freeze({
    10003: "unknown_channel",
    50001: "missing_access",
    50013: "missing_permissions",
    50083: "thread_archived"
});

const SUPPORTED_TYPES = new Set([
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
    ChannelType.AnnouncementThread,
    ChannelType.PublicThread,
    ChannelType.PrivateThread,
    ChannelType.GuildForum
]);

const THREAD_TYPES = new Set([
    ChannelType.AnnouncementThread,
    ChannelType.PublicThread,
    ChannelType.PrivateThread
]);

const OBSERVED_PERMISSIONS = Object.freeze({
    viewChannel: PermissionFlagsBits.ViewChannel,
    sendMessages: PermissionFlagsBits.SendMessages,
    sendMessagesInThreads:
        PermissionFlagsBits.SendMessagesInThreads,
    readMessageHistory:
        PermissionFlagsBits.ReadMessageHistory,
    manageThreads: PermissionFlagsBits.ManageThreads,
    manageWebhooks: PermissionFlagsBits.ManageWebhooks
});

class DiscordChannelDiagnosticService {
    async inspectChannel(channel, context = {}) {
        if (!channel) {
            return this.notFoundDiagnostic(
                "unknown_channel",
                null,
                "object"
            );
        }

        const isThread = this.isThread(channel);
        const parent = isThread
            ? await this.resolveParent(channel, context)
            : {
                channel: channel.parent || null,
                source: channel.parent ? "object" : null,
                error: null
            };
        const archived = isThread
            ? Boolean(channel.archived)
            : null;
        const locked = isThread
            ? Boolean(channel.locked)
            : null;
        const supported = SUPPORTED_TYPES.has(channel.type);

        return {
            found: true,
            available:
                supported
                && !archived
                && !locked,
            status: this.channelStatus({
                supported,
                archived,
                locked
            }),
            source: context.source || "object",
            channelId: channel.id || null,
            channelType: channel.type ?? null,
            channelKind: this.channelKind(channel.type),
            isTextBased: Boolean(
                channel.isTextBased?.()
            ),
            isThread,
            isForum: channel.type === ChannelType.GuildForum,
            isForumPost: Boolean(
                isThread
                && parent.channel?.type === ChannelType.GuildForum
            ),
            parentId: channel.parentId || parent.channel?.id || null,
            parentType: parent.channel?.type ?? null,
            parentSource: parent.source,
            parentError: parent.error,
            archived,
            locked,
            permissions: this.inspectPermissions(
                channel,
                context
            )
        };
    }

    async resolveChannel(channelId, context = {}) {
        const manager = this.resolveChannelManager(context);

        if (!channelId || typeof manager?.fetch !== "function") {
            return this.notFoundDiagnostic(
                "unknown_channel",
                channelId || null,
                "fetch"
            );
        }

        try {
            const channel = await manager.fetch(channelId);

            if (!channel) {
                return this.notFoundDiagnostic(
                    "unknown_channel",
                    channelId,
                    "fetch"
                );
            }

            const diagnostic = await this.inspectChannel(channel, {
                ...context,
                source: "fetch"
            });
            return { ...diagnostic, channel };
        } catch (error) {
            const classified =
                this.classifyDiscordChannelError(error);

            return {
                ...this.notFoundDiagnostic(
                    classified.kind,
                    channelId,
                    "fetch"
                ),
                error: classified
            };
        }
    }

    classifyDiscordChannelError(error) {
        const numericCode = Number(error?.code);
        const discordCode = Number.isFinite(numericCode)
            ? numericCode
            : error?.code ?? null;

        return {
            kind:
                CHANNEL_ERROR_KINDS[numericCode]
                || "discord_error",
            discordCode,
            retryable: false,
            message: this.cleanTechnicalMessage(error)
        };
    }

    async resolveParent(channel, context) {
        if (channel.parent) {
            return {
                channel: channel.parent,
                source: "object",
                error: null
            };
        }

        if (!channel.parentId) {
            return {
                channel: null,
                source: null,
                error: null
            };
        }

        const manager =
            channel.guild?.channels
            || this.resolveChannelManager(context);

        if (typeof manager?.fetch !== "function") {
            return {
                channel: null,
                source: null,
                error: null
            };
        }

        try {
            return {
                channel: await manager.fetch(channel.parentId),
                source: "fetch",
                error: null
            };
        } catch (error) {
            return {
                channel: null,
                source: "fetch",
                error: this.classifyDiscordChannelError(error)
            };
        }
    }

    inspectPermissions(channel, context) {
        const subject =
            context.botMember
            || channel.guild?.members?.me
            || context.guild?.members?.me
            || context.client?.user
            || null;

        if (
            !subject
            || typeof channel.permissionsFor !== "function"
        ) {
            return null;
        }

        const permissions = channel.permissionsFor(subject);

        if (typeof permissions?.has !== "function") {
            return null;
        }

        return Object.fromEntries(
            Object.entries(OBSERVED_PERMISSIONS)
                .map(([name, permission]) => [
                    name,
                    Boolean(permissions.has(permission))
                ])
        );
    }

    resolveChannelManager(context) {
        if (typeof context?.channels?.fetch === "function") {
            return context.channels;
        }

        if (typeof context?.guild?.channels?.fetch === "function") {
            return context.guild.channels;
        }

        if (typeof context?.client?.channels?.fetch === "function") {
            return context.client.channels;
        }

        return null;
    }

    isThread(channel) {
        if (typeof channel?.isThread === "function") {
            return Boolean(channel.isThread());
        }

        return THREAD_TYPES.has(channel?.type);
    }

    channelKind(type) {
        const kinds = {
            [ChannelType.GuildText]: "guild_text",
            [ChannelType.GuildAnnouncement]: "guild_announcement",
            [ChannelType.AnnouncementThread]: "announcement_thread",
            [ChannelType.PublicThread]: "public_thread",
            [ChannelType.PrivateThread]: "private_thread",
            [ChannelType.GuildForum]: "guild_forum"
        };

        return kinds[type] || "unsupported";
    }

    channelStatus({ supported, archived, locked }) {
        if (!supported) return "unsupported_type";
        if (archived && locked) return "archived_locked";
        if (archived) return "archived";
        if (locked) return "locked";
        return "available";
    }

    notFoundDiagnostic(status, channelId, source) {
        return {
            found: false,
            available: false,
            status,
            source,
            channelId,
            channelType: null,
            channelKind: null,
            isTextBased: false,
            isThread: false,
            isForum: false,
            isForumPost: false,
            parentId: null,
            parentType: null,
            parentSource: null,
            parentError: null,
            archived: null,
            locked: null,
            permissions: null,
            error: null
        };
    }

    cleanTechnicalMessage(error) {
        return String(
            error?.message
            || error
            || "Erreur Discord inconnue"
        )
            .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
            .replace(
                /\/api\/webhooks\/\d+\/[^\s/?]+/gi,
                "/api/webhooks/[REDACTED]"
            )
            .slice(0, 500);
    }
}

module.exports = new DiscordChannelDiagnosticService();
