const repository = require("../../repositories/PublicPlaceRepository");
const referenceResolver = require("../../core/services/DiscordReferenceResolverService");
const referenceHealth = require("../../core/services/DiscordReferenceHealthService");
const channelDiagnostic = require("../../core/services/DiscordChannelDiagnosticService");

class PublicPlaceForumService {
    async synchronize(guildId, contextId, forum, options = {}) {
        if (typeof contextId === "object") return this.synchronizeLegacy(guildId,contextId,forum||{});
        const result = await this.synchronizeWithStatus(
            guildId,
            contextId,
            forum,
            options
        );
        return result.places;
    }

    async synchronizeWithStatus(guildId, contextId, forum, options = {}) {
        this.requireContext(guildId,contextId,true);
        const forumReference = this.forumReference(guildId, forum.id);
        const forumResolution = await referenceResolver.resolve(
            forumReference,
            { guild: forum.guild },
            {
                channel: forum,
                force: !options.automatic,
                now: options.now || new Date()
            }
        );
        if (!forumResolution.available) {
            return {
                complete: false,
                places: repository.getByForum(guildId, contextId, forum.id)
            };
        }

        const inventory = await this.collectInventory(forum);
        if (inventory.error) {
            referenceResolver.recordFailure(
                forumReference,
                channelDiagnostic.classifyDiscordChannelError(
                    inventory.error
                ),
                options.now || new Date()
            );
        }

        const threads = new Map();
        for (const thread of inventory.threads.values()) {
            threads.set(thread.id, thread);
        }

        const existing = repository.getByForum(guildId, contextId, forum.id);
        if (inventory.complete) {
            for (const place of existing) {
                if (threads.has(place.channel_id)) continue;
                const resolution = await referenceResolver.resolve(
                    this.placeReference(guildId, place.channel_id),
                    { guild: forum.guild },
                    { now: options.now || new Date() }
                );
                if (resolution.available) {
                    threads.set(place.channel_id, resolution.channel);
                }
            }
        }

        for (const thread of threads.values()) {
            const reference = this.placeReference(guildId, thread.id);
            if (referenceHealth.get(reference)) {
                referenceHealth.markResolved(
                    reference,
                    options.now || new Date()
                );
            }
        }

        const places = repository.upsertMany(guildId, contextId, forum.id, [...threads.values()].map(thread => ({
            id: thread.id,
            name: thread.name,
            archived: Boolean(thread.archived)
        })));
        return {
            complete: inventory.complete,
            places
        };
    }

    async collectInventory(forum) {
        const threads = new Map();
        let complete = true;
        let error = null;
        try {
            const active = await forum.threads.fetchActive();
            for (const thread of active.threads.values()) {
                threads.set(thread.id, thread);
            }
        } catch (activeError) {
            complete = false;
            error = activeError;
            for (const thread of forum.guild.channels.cache.values()) {
                if (String(thread.parentId) === String(forum.id)) {
                    threads.set(thread.id, thread);
                }
            }
        }

        let before;
        let hasMore = true;
        while (hasMore) {
            let result;
            try {
                result = await forum.threads.fetchArchived({
                    limit: 100,
                    ...(before ? { before: new Date(before) } : {})
                });
            } catch (archiveError) {
                complete = false;
                error ||= archiveError;
                break;
            }
            for (const thread of result.threads.values()) {
                threads.set(thread.id, thread);
            }
            if (!result.hasMore) break;
            const lastArchive = result.threads.last()?.archiveTimestamp;
            if (!result.threads.size || !lastArchive) {
                complete = false;
                break;
            }
            before = lastArchive;
        }

        return { threads, complete, error };
    }

    forumReference(guildId, forumId) {
        return {
            domain: "public_place",
            ownerKey: `forum:${forumId}`,
            resourceKind: "channel",
            discordId: forumId,
            guildId
        };
    }

    placeReference(guildId, channelId) {
        return {
            domain: "public_place",
            ownerKey: `place:${guildId}:${channelId}`,
            resourceKind: "thread",
            discordId: channelId,
            guildId
        };
    }

    get(guildId, contextId, forumId) {
        this.requireContext(guildId,contextId,false);
        return repository.getByForum(guildId, contextId, forumId);
    }

    getPublished(guildId,contextId) {
        this.requireContext(guildId,contextId,false);
        return repository.getPublishedForContext(guildId,contextId);
    }

    categorize(guildId, contextId, channelId, category) {
        this.requireContext(guildId,contextId,true);
        const result=repository.setCategory(guildId, contextId, channelId, category);
        if(!result||result.changes!==1)throw new Error("Lieu public introuvable dans ce Context.");
        return result;
    }
    requireContext(guildId,contextId,write){if(!repository.supportsRuntime())return null;if(!contextId)throw new Error("Un Context explicite est obligatoire pour les lieux publics.");const c=repository.context(guildId,contextId);if(!c)throw new Error("Context introuvable sur ce serveur.");if(write&&Number(c.is_active)!==1)throw new Error("Ce Context est inactif.");return c;}
    async synchronizeLegacy(guildId,forum,options={}){const result=await this.synchronizeWithStatusLegacy(guildId,forum,options);return result.places;}
    async synchronizeWithStatusLegacy(guildId,forum,options={}){if(repository.supportsRuntime())throw new Error("Un Context explicite est obligatoire pour les lieux publics.");const inventory=await this.collectInventory(forum);return {complete:inventory.complete,places:repository.upsertMany(guildId,null,forum.id,[...inventory.threads.values()].map(t=>({id:t.id,name:t.name,archived:Boolean(t.archived)})))};}
}

module.exports = new PublicPlaceForumService();
