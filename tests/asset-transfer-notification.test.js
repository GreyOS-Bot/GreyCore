const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const notificationService =
    require(
        "../src/v2/services/assets/AssetTransferNotificationService"
    );

test(
    "un transfert vers un autre joueur envoie une alerte avec le lien du salon",
    async () => {
        let receivedPayload = null;

        const sent =
            await notificationService
                .notify({
                    client: {
                        users: {
                            fetch: async userId => {
                                assert.equal(
                                    userId,
                                    "recipient"
                                );

                                return {
                                    send: async payload => {
                                        receivedPayload =
                                            payload;
                                    }
                                };
                            }
                        }
                    },
                    recipientId: "recipient",
                    senderId: "sender",
                    senderCharacterName: "Nelyne",
                    recipientCharacterName: "Alba",
                    assetName: "Stylo bic",
                    guildId: "guild",
                    channelId: "channel"
                });

        assert.equal(sent, true);
        assert.match(
            receivedPayload.content,
            /Nouveau bien reçu/
        );
        assert.match(
            receivedPayload.content,
            /Nelyne/
        );
        assert.match(
            receivedPayload.content,
            /Stylo bic/
        );
        assert.match(
            receivedPayload.content,
            /https:\/\/discord\.com\/channels\/guild\/channel/
        );
    }
);

test(
    "un transfert entre les personnages d’un même utilisateur ne crée pas d’alerte inutile",
    async () => {
        let fetchCalled = false;

        const sent =
            await notificationService
                .notify({
                    client: {
                        users: {
                            fetch: async () => {
                                fetchCalled = true;
                            }
                        }
                    },
                    recipientId: "same-user",
                    senderId: "same-user",
                    senderCharacterName: "Alba",
                    recipientCharacterName: "Vega",
                    assetName: "Stylo bic"
                });

        assert.equal(sent, false);
        assert.equal(fetchCalled, false);
    }
);
