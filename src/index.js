require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const loadEvents = require("./loaders/eventLoader");
const loadCommands = require("./loaders/commandLoader");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

loadEvents(client);
loadCommands(client);

client.login(process.env.TOKEN);