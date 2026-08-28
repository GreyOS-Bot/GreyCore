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

const proxyMessageHandler =
    require(
        "../messageCreate/ProxyMessageHandler"
    );

const historicalWebhookService = require(
    "../../../v2/core/services/ProxyHistoricalWebhookService"
);

const logger = require(
    "../../../v2/core/services/TechnicalLogger"
).create(
    "ProxyMessageUpdateHandler"
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
            /*
             * Un GIF ou une image peut \u00eatre envoy\u00e9(e) avant
             * d'ajouter le proxy par modification du message.
             * Le message n'a alors pas encore d'enregistrement
             * GreyCore : on le traite comme un nouveau proxy.
             */
            return proxyMessageHandler(
                message
            );
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

        const result =
            await historicalWebhookService.edit({
                client:
                    message.client,
                guild:
                    message.guild,
                channelId:
                    proxyRecord.channel_id,
                currentChannel:
                    message.channel || null,
                webhookId:
                    proxyRecord.webhook_id,
                webhookMessageId:
                    proxyRecord.webhook_message_id,
                payload: {
                    content:
                        proxy.content
                }
            });

        if (!result.success) {
            logger.warn(
                "Édition Proxy historique impossible.",
                {
                    discordMessageId:
                        message.id,
                    proxyWebhookMessageId:
                        proxyRecord.webhook_message_id,
                    channelId:
                        proxyRecord.channel_id,
                    classification:
                        result.status,
                    discordCode:
                        result.discordCode
                }
            );
        }

        return result.success;
    };
