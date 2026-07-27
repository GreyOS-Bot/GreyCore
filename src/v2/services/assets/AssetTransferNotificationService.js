const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "AssetTransferNotificationService"
    );

class AssetTransferNotificationService {

    shouldNotify({
        recipientId,
        senderId
    }) {
        return Boolean(
            recipientId
            && (
                !senderId
                || String(recipientId)
                    !== String(senderId)
            )
        );
    }

    async notify({
        client,
        recipientId,
        senderId,
        senderCharacterName,
        recipientCharacterName,
        assetName,
        guildId,
        channelId
    }) {
        if (
            !this.shouldNotify({
                recipientId,
                senderId
            })
            || !client?.users
        ) {
            return false;
        }

        const recipient =
            await client.users
                .fetch(
                    String(recipientId)
                )
                .catch(
                    () => null
                );

        if (!recipient) {
            return false;
        }

        return recipient.send({
            content: this.buildContent({
                senderCharacterName,
                recipientCharacterName,
                assetName,
                guildId,
                channelId
            })
        })
            .then(
                () => true
            )
            .catch(
                error => {
                    logger.warn(
                        "Notification de transfert de bien impossible.",
                        error
                    );

                    return false;
                }
            );
    }

    buildContent({
        senderCharacterName,
        recipientCharacterName,
        assetName,
        guildId,
        channelId
    }) {
        const channelLink =
            this.buildChannelLink({
                guildId,
                channelId
            });

        return [
            "🎁 **Nouveau bien reçu**",
            "",
            `**${this.cleanText(senderCharacterName, "Un personnage")}** a transféré **${this.cleanText(assetName, "un bien")}** à **${this.cleanText(recipientCharacterName, "votre personnage")}**.`,
            channelLink
                ? ""
                : null,
            channelLink
                ? `🔗 [Ouvrir le salon du transfert](${channelLink})`
                : null
        ]
            .filter(Boolean)
            .join("\n");
    }

    buildChannelLink({
        guildId,
        channelId
    }) {
        if (!guildId || !channelId) {
            return null;
        }

        return [
            "https://discord.com/channels",
            guildId,
            channelId
        ].join("/");
    }

    cleanText(
        value,
        fallback
    ) {
        const text =
            String(value || "").trim();

        return text || fallback;
    }
}

module.exports =
    new AssetTransferNotificationService();
