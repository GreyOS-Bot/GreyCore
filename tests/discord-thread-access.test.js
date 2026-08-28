const test = require("node:test");
const assert = require("node:assert/strict");

const {
    ChannelType
} = require("discord.js");

const service = require(
    "../src/v2/core/services/DiscordThreadAccessService"
);

test(
    "les salons normaux et threads actifs sont prêts sans mutation",
    async () => {
        for (const target of [
            mockChannel(ChannelType.GuildText),
            mockChannel(ChannelType.PublicThread)
        ]) {
            const result =
                await service.ensureWritable(target);

            assert.equal(result.status, "ready");
            assert.equal(result.ready, true);
            assert.deepEqual(target.calls, []);
        }
    }
);

test(
    "un thread seulement archivé est rouvert exactement une fois",
    async () => {
        const target = mockChannel(
            ChannelType.PublicThread,
            { archived: true }
        );

        const result =
            await service.ensureWritable(target);

        assert.equal(result.status, "reopened");
        assert.equal(result.ready, true);
        assert.equal(result.reopened, true);
        assert.deepEqual(target.calls, [
            ["setArchived", false]
        ]);
        assert.equal(result.channel.archived, false);
    }
);

test(
    "les refus de réouverture conservent leur diagnostic Discord",
    async () => {
        for (const [code, status] of [
            [50013, "missing_permissions"],
            [50001, "missing_access"],
            [10003, "unknown_channel"],
            [59999, "discord_error"]
        ]) {
            const target = mockChannel(
                ChannelType.PrivateThread,
                {
                    archived: true,
                    reopenError: code
                }
            );

            const result =
                await service.ensureWritable(target);

            assert.equal(result.ready, false);
            assert.equal(result.status, status);
            assert.equal(result.error.discordCode, code);
            assert.deepEqual(target.calls, [
                ["setArchived", false]
            ]);
        }
    }
);

test(
    "un thread verrouillé n'est jamais rouvert ni déverrouillé",
    async () => {
        for (const archived of [false, true]) {
            const target = mockChannel(
                ChannelType.AnnouncementThread,
                { archived, locked: true }
            );

            const result =
                await service.ensureWritable(target);

            assert.equal(result.status, "locked");
            assert.equal(result.ready, false);
            assert.deepEqual(target.calls, []);
            assert.match(
                service.errorFor(result).message,
                /verrouillé/
            );
        }
    }
);

function mockChannel(type, options = {}) {
    const calls = [];
    const parent = {
        id: "parent",
        type: ChannelType.GuildText
    };
    const target = {
        id: "thread",
        type,
        parent,
        parentId: parent.id,
        archived: Boolean(options.archived),
        locked: Boolean(options.locked),
        calls,
        isThread: () => [
            ChannelType.PublicThread,
            ChannelType.PrivateThread,
            ChannelType.AnnouncementThread
        ].includes(type),
        isTextBased: () => true,
        setLocked: value => {
            calls.push(["setLocked", value]);
        },
        setArchived: async value => {
            calls.push(["setArchived", value]);
            if (options.reopenError) {
                const error = new Error("Discord refuse");
                error.code = options.reopenError;
                throw error;
            }
            target.archived = value;
            return target;
        }
    };

    return target;
}
