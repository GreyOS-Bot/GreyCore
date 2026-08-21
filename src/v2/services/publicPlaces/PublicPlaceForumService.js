const repository = require("../../repositories/PublicPlaceRepository");

class PublicPlaceForumService {
    async synchronize(guildId, forum) {
        const threads = new Map();
        try {
            const active = await forum.threads.fetchActive();
            for (const thread of active.threads.values()) threads.set(thread.id, thread);
        } catch (error) {
            for (const thread of forum.guild.channels.cache.values()) {
                if (String(thread.parentId) === String(forum.id)) threads.set(thread.id, thread);
            }
            if (!threads.size) throw new Error(
                "GreyCore ne peut pas lire les salons de ce forum. Vérifie les permissions Voir le salon et Voir les anciens messages.",
                { cause: error }
            );
        }
        let before;
        let hasMore = true;
        while (hasMore) {
            let result;
            try {
                result = await forum.threads.fetchArchived({ limit: 100, ...(before ? { before: new Date(before) } : {}) });
            } catch {
                break;
            }
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

    getPublished(guildId) {
        return repository.getPublishedForGuild(guildId);
    }

    categorize(guildId, channelId, category) {
        return repository.setCategory(guildId, channelId, category);
    }
}

module.exports = new PublicPlaceForumService();
