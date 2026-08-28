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

const {
    withThreadId
} = require(
    "../../../v2/core/services/ProxyThreadContext"
);

const threadAccessService = require(
    "../../../v2/core/services/DiscordThreadAccessService"
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

        const channel =
            message.channel?.id ===
                proxyRecord.channel_id
                ? message.channel
                : message.guild.channels.cache
                    .get(
                        proxyRecord.channel_id
                    );

        if (!channel) {
            return false;
        }

        const access =
            await threadAccessService.ensureWritable(
                channel
            );

        if (!access.ready) {
            throw threadAccessService.errorFor(
                access,
                "proxy_update"
            );
        }

        const writableChannel =
            access.channel || channel;

        const webhook =
            await writableChannel.client
                .fetchWebhook(
                    proxyRecord.webhook_id
                );

        await webhook.editMessage(
            proxyRecord.webhook_message_id,
            withThreadId(
                writableChannel,
                {
                    content:
                        proxy.content
                }
            )
        );

        return true;
    };
