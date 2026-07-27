const {
    parseProxy
} = require(
    "../../../services/proxyService"
);

const {
    resolveProxyCharacter,
    matchesCharacterReference
} = require(
    "../../../services/proxy/ProxyCharacterResolver"
);

const proxyMessageManager =
    require(
        "../../../managers/ProxyMessageManager"
    );

module.exports =
    async function proxyMessageUpdateHandler(
        message
    ) {
        if (
            !message.guild
            ||
            message.author?.bot
        ) {
            return false;
        }

        const proxyRecord =
            proxyMessageManager.get(
                message.id
            );

        if (!proxyRecord) {
            return false;
        }

        const proxy =
            parseProxy(
                message.content
            );

        if (!proxy) {
            return false;
        }

        const {
            character
        } = resolveProxyCharacter({
            discordUserId:
                message.author.id,
            guildId:
                message.guild.id,
            proxyName:
                proxy.character
        });

        if (!character) {
            return false;
        }

        if (
            !matchesCharacterReference(
                character,
                {
                    characterId:
                        proxyRecord
                            .character_id,
                    characterVersion:
                        proxyRecord
                            .character_version
                        ||
                        "v1"
                }
            )
        ) {
            return false;
        }

        const channel =
            message.guild.channels.cache
                .get(
                    proxyRecord.channel_id
                );

        if (!channel) {
            return false;
        }

        const webhook =
            await channel.client
                .fetchWebhook(
                    proxyRecord.webhook_id
                );

        await webhook.editMessage(
            proxyRecord.webhook_message_id,
            {
                content:
                    proxy.content
            }
        );

        return true;
    };
