const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    Client,
    GatewayIntentBits
} = require("discord.js");

const {
    createIsolatedDatabase,
    withMutedConsole
} = require(
    "./helpers/isolatedDatabase"
);

test(
    "les événements et commandes chargent sur une base isolée",
    async context => {
        const isolated =
            createIsolatedDatabase();

        const client =
            new Client({
                intents: [
                    GatewayIntentBits
                        .Guilds,
                    GatewayIntentBits
                        .GuildMessages,
                    GatewayIntentBits
                        .MessageContent
                ]
            });

        context.after(() => {
            client.destroy();
            isolated.cleanup();
        });

        await withMutedConsole(
            async () => {
                require(
                    "../src/database/schema"
                ).initializeDatabase();

                require(
                    "../src/loaders/eventLoader"
                )(client);

                require(
                    "../src/loaders/commandLoader"
                )(client);
            }
        );

        assert.equal(
            client.commands.size,
            22
        );

        for (
            const commandName
            of [
                "installer-etats",
                "installer-relations",
                "etattype",
                "supprimer-etat",
                "relationtype",
                "personnages",
                "validations",
                "confidentialite"
            ]
        ) {
            assert.equal(
                client.commands
                    .get(commandName)
                    .data
                    .toJSON()
                    .default_member_permissions,
                undefined,
                commandName
            );
        }

        for (
            const eventName
            of [
                "clientReady",
                "guildCreate",
                "interactionCreate",
                "messageCreate",
                "messageUpdate",
                "messageDelete"
            ]
        ) {
            assert.equal(
                client.listenerCount(
                    eventName
                ) > 0,
                true,
                eventName
            );
        }
    }
);
