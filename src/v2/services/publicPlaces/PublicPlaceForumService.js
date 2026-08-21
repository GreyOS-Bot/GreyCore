const repository = require("../../repositories/PublicPlaceRepository");

class PublicPlaceForumService {
    async synchronize(guildId, forum) {
        const active = await forum.threads.fetchActive();
        const threads = new Map(active.threads.map(thread => [thread.id, thread]));
        let before;
        let hasMore = true;
        while (hasMore) {
            const result = await forum.threads.fetchArchived({ limit: 100, ...(before ? { before } : {}) });
            for (const thread of result.threads.values()) threads.set(thread.id, thread);
            hasMore = Boolean(result.hasMore) && result.threads.size > 0;
            before = result.threads.last()?.archiveTimestamp;
        }
        return repository.upsertMany(guildId, forum.id, [...threads.values()].map(thread => ({
            id: thread.id,
            name: thread.name,
            archived: Boolean(thread.archived)
        })));
    }

    get(guildId, forumId) {
        return repository.getByForum(guildId, forumId);
    }

    categorize(guildId, channelId, category) {
        return repository.setCategory(guildId, channelId, category);
    }
}

module.exports = new PublicPlaceForumService();
