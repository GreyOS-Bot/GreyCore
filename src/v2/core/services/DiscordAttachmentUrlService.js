const REFRESH_MARGIN_SECONDS = 300;

class DiscordAttachmentUrlService {
    constructor() {
        this.cache = new Map();
    }

    async resolve(client, value) {
        const parsed = this.parse(value);

        if (!parsed || !this.needsRefresh(parsed.url)) {
            return value || null;
        }

        const cached = this.cache.get(parsed.attachmentId);

        if (cached && !this.needsRefresh(cached)) {
            return cached;
        }

        try {
            const channel = await client.channels.fetch(
                parsed.channelId
            );
            const messages = await channel.messages.fetch({
                around: parsed.attachmentId,
                limit: 10
            });

            for (const message of messages.values()) {
                const attachment =
                    message.attachments.get(
                        parsed.attachmentId
                    );

                if (attachment?.url) {
                    this.cache.set(
                        parsed.attachmentId,
                        attachment.url
                    );

                    return attachment.url;
                }
            }
        } catch {
            // Le lien enregistré reste utilisé si le message source est inaccessible.
        }

        return value;
    }

    parse(value) {
        if (!value) {
            return null;
        }

        try {
            const url = new URL(value);

            if (
                url.hostname !== "cdn.discordapp.com"
                && url.hostname !== "media.discordapp.net"
            ) {
                return null;
            }

            const match = url.pathname.match(
                /^\/attachments\/(\d+)\/(\d+)\//
            );

            if (!match) {
                return null;
            }

            return {
                url,
                channelId: match[1],
                attachmentId: match[2]
            };
        } catch {
            return null;
        }
    }

    needsRefresh(value) {
        const url = value instanceof URL
            ? value
            : this.parse(value)?.url;

        if (!url) {
            return false;
        }

        const expiry = Number.parseInt(
            url.searchParams.get("ex"),
            16
        );

        if (!Number.isFinite(expiry)) {
            return false;
        }

        return expiry <= (
            Math.floor(Date.now() / 1000)
            + REFRESH_MARGIN_SECONDS
        );
    }
}

module.exports =
    new DiscordAttachmentUrlService();
