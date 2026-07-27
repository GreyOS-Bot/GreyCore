const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

function loadCommands(client) {

    client.commands = new Collection();

    const commandsPath = path.join(__dirname, "../commands");

    function readFolder(folder) {

        const files = fs.readdirSync(folder);

        for (const file of files) {

            const filePath = path.join(folder, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                readFolder(filePath);
                continue;
            }

            if (!file.endsWith(".js")) continue;

            const command = require(filePath);

            if (!command.data || !command.execute) {
                console.log(`⚠️ ${file} ignoré.`);
                continue;
            }

            client.commands.set(command.data.name, command);

            console.log(`✅ Commande chargée : ${command.data.name}`);

        }

    }

    readFolder(commandsPath);

}

module.exports = loadCommands;