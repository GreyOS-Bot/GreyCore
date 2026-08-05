const test = require("node:test");
const assert = require("node:assert/strict");

const service = require(
    "../src/v2/core/services/DiscordAttachmentUrlService"
);

test(
    "un avatar Discord expiré récupère un lien frais depuis son message source",
    async () => {
        const attachmentId = "222222222222222222";
        const freshUrl =
            "https://cdn.discordapp.com/attachments/111111111111111111/222222222222222222/avatar.png?ex=ffffffff&is=1&hm=fresh";
        let requestedChannel;
        let fetchOptions;

        const result = await service.resolve(
            {
                channels: {
                    fetch: async channelId => {
                        requestedChannel = channelId;

                        return {
                            messages: {
                                fetch: async options => {
                                    fetchOptions = options;

                                    return new Map([
                                        [
                                            "message",
                                            {
                                                attachments:
                                                    new Map([
                                                        [
                                                            attachmentId,
                                                            {
                                                                url: freshUrl
                                                            }
                                                        ]
                                                    ])
                                            }
                                        ]
                                    ]);
                                }
                            }
                        };
                    }
                }
            },
            "https://cdn.discordapp.com/attachments/111111111111111111/222222222222222222/avatar.png?ex=00000001&is=1&hm=expired"
        );

        assert.equal(
            requestedChannel,
            "111111111111111111"
        );
        assert.deepEqual(
            fetchOptions,
            {
                around: attachmentId,
                limit: 10
            }
        );
        assert.equal(result, freshUrl);
    }
);

test(
    "un avatar externe ou encore valide ne déclenche aucun accès Discord",
    async () => {
        let fetchCount = 0;
        const client = {
            channels: {
                fetch: async () => {
                    fetchCount += 1;
                }
            }
        };
        const external =
            "https://images.example/avatar.png";

        assert.equal(
            await service.resolve(client, external),
            external
        );
        assert.equal(fetchCount, 0);
    }
);
