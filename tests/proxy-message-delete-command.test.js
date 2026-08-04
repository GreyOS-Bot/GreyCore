const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "le propriétaire peut supprimer son message proxy",
    async () => {
        const calls = [];

        stubModule(
            "src/managers/ProxyMessageManager.js",
            {
                getByWebhookMessageId: () => ({
                    discord_message_id: "source",
                    webhook_message_id: "proxy",
                    webhook_id: "webhook",
                    author_id: "owner"
                }),
                delete: id => {
                    calls.push(["record.delete", id]);
                }
            }
        );

        const commandPath = require.resolve(
            "../src/commands/proxy/supprimerMessage"
        );
        delete require.cache[commandPath];
        const command = require(
            "../src/commands/proxy/supprimerMessage"
        );

        const interaction = {
            targetMessage: {
                id: "proxy",
                channel: {
                    id: "channel",
                    isThread: () => false
                }
            },
            user: { id: "owner" },
            client: {
                fetchWebhook: async id => {
                    calls.push(["webhook.fetch", id]);
                    return {
                        deleteMessage: async messageId => {
                            calls.push([
                                "webhook.delete",
                                messageId
                            ]);
                        }
                    };
                }
            },
            deferReply: async () => {},
            editReply: async payload => {
                calls.push(["reply", payload.content]);
            }
        };

        await command.execute(interaction);

        assert.deepEqual(
            calls,
            [
                ["webhook.fetch", "webhook"],
                ["webhook.delete", "proxy"],
                ["record.delete", "source"],
                ["reply", "🗑️ Message proxy supprimé."]
            ]
        );
    }
);

test(
    "un utilisateur ne peut pas supprimer le proxy d'un autre",
    async () => {
        let fetched = false;

        stubModule(
            "src/managers/ProxyMessageManager.js",
            {
                getByWebhookMessageId: () => ({
                    author_id: "other"
                })
            }
        );

        const commandPath = require.resolve(
            "../src/commands/proxy/supprimerMessage"
        );
        delete require.cache[commandPath];
        const command = require(
            "../src/commands/proxy/supprimerMessage"
        );

        const interaction = {
            targetMessage: { id: "proxy" },
            user: { id: "owner" },
            client: {
                fetchWebhook: async () => {
                    fetched = true;
                }
            },
            reply: async function (payload) {
                this.response = payload;
            }
        };

        await command.execute(interaction);

        assert.equal(fetched, false);
        assert.match(
            interaction.response.content,
            /propres messages/
        );
    }
);
