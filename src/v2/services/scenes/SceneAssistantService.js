const {
    EmbedBuilder
} = require("discord.js");

const manager =
    require(
        "../../managers/SceneAssistantV2Manager"
    );

const DAY_IN_MILLISECONDS =
    24 * 60 * 60 * 1_000;

class SceneAssistantService {

    async processMessage(message) {
        if (
            !message
            || message.author?.bot
        ) {
            return null;
        }

        const guildId =
            message.guildId
            || message.guild?.id
            || null;

        const channelId = message.channelId
            || message.channel?.id
            || null;

        if (!guildId || !channelId) {
            return null;
        }

        const configuration =
            manager.getConfiguration(guildId);

        if (
            !configuration
            || Number(configuration.is_enabled) !== 1
        ) {
            return null;
        }

        if (
            !this.isTrackedChannel(
                message.channel,
                channelId,
                manager.getScopes(guildId)
            )
        ) {
            return null;
        }

        const cycle = manager.recordMessage({
            guildId,
            channelId,
            occurredAt: this.getMessageTimestamp(message)
        });

        const evaluation =
            this.evaluateCycle(
                cycle,
                configuration
            );

        if (!evaluation.shouldConclude) {
            return {
                configuration,
                cycle,
                evaluation,
                justReachedThreshold: false
            };
        }

        const justReachedThreshold =
            cycle.status !== "conclude";

        const updatedCycle =
            manager.markConclude({
                guildId,
                channelId
            });

        return {
            configuration,
            cycle: updatedCycle,
            evaluation,
            justReachedThreshold
        };
    }

    getStatus({
        guildId,
        channel,
        now = new Date()
    }) {
        const configuration =
            manager.getConfiguration(guildId);

        if (
            !configuration
            || Number(configuration.is_enabled) !== 1
        ) {
            return {
                kind: "disabled"
            };
        }

        const channelId = channel?.id || null;

        if (
            !channelId
            || !this.isTrackedChannel(
                channel,
                channelId,
                manager.getScopes(guildId)
            )
        ) {
            return {
                kind: "untracked"
            };
        }

        const cycle = manager.getCycle(
            guildId,
            channelId
        );

        if (!cycle) {
            return {
                kind: "not_started",
                configuration
            };
        }

        const evaluation =
            this.evaluateCycle(
                cycle,
                configuration,
                now
            );

        const updatedCycle = evaluation.shouldConclude
            && cycle.status !== "conclude"
            ? manager.markConclude({
                guildId,
                channelId
            })
            : cycle;

        return {
            kind: "tracked",
            configuration,
            cycle: updatedCycle,
            evaluation
        };
    }

    startNewCycle({
        guildId,
        channel
    }) {
        if (!channel?.id) {
            throw new Error(
                "Ce cycle doit \u00eatre relanc\u00e9 depuis un salon RP."
            );
        }

        const configuration =
            manager.getConfiguration(guildId);

        if (
            !configuration
            || Number(configuration.is_enabled) !== 1
        ) {
            throw new Error(
                "L'Assistant de gestion des sc\u00e8nes est d\u00e9sactiv\u00e9 sur ce serveur."
            );
        }

        if (
            !this.isTrackedChannel(
                channel,
                channel.id,
                manager.getScopes(guildId)
            )
        ) {
            throw new Error(
                "Ce salon ne fait pas partie d'une zone RP suivie."
            );
        }

        return manager.startNewCycle({
            guildId,
            channelId: channel.id
        });
    }

    evaluateCycle(cycle, configuration, now = new Date()) {
        const durationDays =
            this.asPositiveInteger(
                configuration.duration_days
            );
        const recommendedMessageCount =
            this.asPositiveInteger(
                configuration.recommended_message_count
            );
        const startedAt = new Date(
            cycle.started_at
        );
        const elapsedDays = Math.max(
            1,
            Math.floor(
                (
                    now.getTime()
                    - startedAt.getTime()
                ) / DAY_IN_MILLISECONDS
            ) + 1
        );
        const durationReached = Boolean(
            durationDays
            && elapsedDays >= durationDays
        );
        const messageReached = Boolean(
            recommendedMessageCount
            && Number(cycle.rp_message_count)
                >= recommendedMessageCount
        );

        return {
            elapsedDays,
            durationDays,
            recommendedMessageCount,
            durationReached,
            messageReached,
            shouldConclude:
                durationReached || messageReached
        };
    }

    isTrackedChannel(channel, channelId, scopes) {
        const scopeIds = new Set(
            scopes.map(
                scope => String(scope.channel_id)
            )
        );

        if (!scopeIds.size) {
            return false;
        }

        return this.getChannelAndParentIds(
            channel,
            channelId
        ).some(
            id => scopeIds.has(String(id))
        );
    }

    getChannelAndParentIds(channel, channelId) {
        const ids = new Set();
        let current = channel || null;

        if (channelId) {
            ids.add(String(channelId));
        }

        for (let depth = 0; current && depth < 5; depth += 1) {
            if (current.id) {
                ids.add(String(current.id));
            }

            if (current.parentId) {
                ids.add(String(current.parentId));
            }

            current = this.getParentChannel(
                current
            );
        }

        return [...ids];
    }

    getParentChannel(channel) {
        if (channel.parent) {
            return channel.parent;
        }

        if (!channel.parentId) {
            return null;
        }

        return channel.guild?.channels?.cache?.get(
            channel.parentId
        ) || channel.client?.channels?.cache?.get(
            channel.parentId
        ) || null;
    }

    getMessageTimestamp(message) {
        const timestamp = message.createdTimestamp
            || message.createdAt?.getTime()
            || Date.now();

        return new Date(timestamp).toISOString();
    }

    asPositiveInteger(value) {
        const number = Number(value);

        return Number.isInteger(number) && number > 0
            ? number
            : null;
    }

    buildThresholdEmbed() {
        return new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle(
                "\u{1F7E8} Cycle de sc\u00e8ne : \u00c0 conclure"
            )
            .setDescription([
                "Cette sc\u00e8ne d\u00e9passe les recommandations configur\u00e9es par le serveur.",
                "Vous pouvez bien s\u00fbr continuer \u00e0 jouer sans aucune restriction, mais il peut \u00eatre pertinent de conclure cette sc\u00e8ne ou d'en ouvrir une nouvelle."
            ].join("\n\n"))
            .setFooter({
                text: "Assistant de gestion des sc\u00e8nes GreyCore \u2022 recommandation uniquement"
            })
            .setTimestamp();
    }

}

module.exports =
    new SceneAssistantService();
