const test = require("node:test");
const assert = require("node:assert/strict");

const {
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

const service = require(
    "../src/v2/core/services/DiscordChannelDiagnosticService"
);

test(
    "le diagnostic reconnaît les salons et tous les types de threads pris en charge",
    async () => {
        const text = await service.inspectChannel(
            channel(ChannelType.GuildText)
        );
        assert.equal(text.status, "available");
        assert.equal(text.channelKind, "guild_text");
        assert.equal(text.isThread, false);
        assert.equal(text.archived, null);

        for (const [type, kind] of [
            [ChannelType.PublicThread, "public_thread"],
            [ChannelType.PrivateThread, "private_thread"],
            [ChannelType.AnnouncementThread, "announcement_thread"]
        ]) {
            const result = await service.inspectChannel(
                channel(type, { isThread: true })
            );
            assert.equal(result.status, "available");
            assert.equal(result.channelKind, kind);
            assert.equal(result.isThread, true);
        }

        const announcement = await service.inspectChannel(
            channel(ChannelType.GuildAnnouncement)
        );
        const forum = await service.inspectChannel(
            channel(ChannelType.GuildForum, { textBased: false })
        );
        assert.equal(announcement.channelKind, "guild_announcement");
        assert.equal(forum.channelKind, "guild_forum");
        assert.equal(forum.isForum, true);

        const unsupported = await service.inspectChannel(
            channel(ChannelType.GuildVoice, { textBased: false })
        );
        assert.equal(unsupported.status, "unsupported_type");
        assert.equal(unsupported.available, false);
    }
);

test(
    "un post de forum résout son parent absent de l'objet sans mutation",
    async () => {
        const calls = [];
        const parent = channel(ChannelType.GuildForum, {
            id: "forum",
            textBased: false
        });
        const thread = channel(ChannelType.PublicThread, {
            id: "post",
            isThread: true,
            parentId: "forum",
            archived: false,
            locked: false,
            mutations: calls,
            guild: {
                channels: {
                    fetch: async id => {
                        assert.equal(id, "forum");
                        return parent;
                    }
                }
            }
        });

        const result = await service.inspectChannel(thread);

        assert.equal(result.isForumPost, true);
        assert.equal(result.parentId, "forum");
        assert.equal(result.parentType, ChannelType.GuildForum);
        assert.equal(result.parentSource, "fetch");
        assert.deepEqual(calls, []);
    }
);

test(
    "les états archivé, verrouillé et combiné restent purement descriptifs",
    async () => {
        const states = [
            [true, false, "archived"],
            [false, true, "locked"],
            [true, true, "archived_locked"]
        ];

        for (const [archived, locked, status] of states) {
            const mutations = [];
            const result = await service.inspectChannel(
                channel(ChannelType.PublicThread, {
                    isThread: true,
                    archived,
                    locked,
                    mutations
                })
            );

            assert.equal(result.status, status);
            assert.equal(result.archived, archived);
            assert.equal(result.locked, locked);
            assert.equal(result.available, false);
            assert.deepEqual(mutations, []);
        }
    }
);

test(
    "la résolution par ID distingue les erreurs Discord confirmées",
    async () => {
        for (const [code, kind] of [
            [10003, "unknown_channel"],
            [50001, "missing_access"],
            [50013, "missing_permissions"],
            [50083, "thread_archived"],
            [59999, "discord_error"]
        ]) {
            const result = await service.resolveChannel(
                "target",
                {
                    channels: {
                        fetch: async () => {
                            const error = new Error(
                                `Discord ${code} Bearer secret`
                            );
                            error.code = code;
                            throw error;
                        }
                    }
                }
            );

            assert.equal(result.status, kind);
            assert.equal(result.error.kind, kind);
            assert.equal(result.error.discordCode, code);
            assert.equal(result.error.retryable, false);
            assert.doesNotMatch(result.error.message, /secret/);
        }
    }
);

test(
    "la résolution réussie indique explicitement une source fetch",
    async () => {
        const result = await service.resolveChannel(
            "text",
            {
                channels: {
                    fetch: async id => channel(
                        ChannelType.GuildText,
                        { id }
                    )
                }
            }
        );

        assert.equal(result.found, true);
        assert.equal(result.channelId, "text");
        assert.equal(result.source, "fetch");
    }
);

test(
    "les permissions utiles sont observées sans action Discord ni mutation DB",
    async () => {
        const mutations = [];
        const allowed = new Set([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessagesInThreads,
            PermissionFlagsBits.ReadMessageHistory
        ]);
        const target = channel(ChannelType.PrivateThread, {
            isThread: true,
            mutations,
            permissionsFor: subject => {
                assert.equal(subject.id, "bot");
                return {
                    has: permission => allowed.has(permission)
                };
            }
        });

        const result = await service.inspectChannel(target, {
            botMember: { id: "bot" }
        });

        assert.deepEqual(result.permissions, {
            viewChannel: true,
            sendMessages: false,
            sendMessagesInThreads: true,
            readMessageHistory: true,
            manageThreads: false,
            manageWebhooks: false
        });
        assert.deepEqual(mutations, []);
    }
);

function channel(type, options = {}) {
    const mutations = options.mutations || [];

    return {
        id: options.id || `channel-${type}`,
        type,
        parent: options.parent || null,
        parentId: options.parentId || null,
        guild: options.guild || null,
        archived: options.archived || false,
        locked: options.locked || false,
        isThread: () => Boolean(options.isThread),
        isTextBased: () => options.textBased !== false,
        permissionsFor: options.permissionsFor,
        setArchived: () => mutations.push("setArchived"),
        setLocked: () => mutations.push("setLocked"),
        send: () => mutations.push("send"),
        edit: () => mutations.push("edit"),
        delete: () => mutations.push("delete")
    };
}
