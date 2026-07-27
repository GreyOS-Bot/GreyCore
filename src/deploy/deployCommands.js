require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const commands = [];

function readCommands(folder) {
    const files = fs.readdirSync(folder);

    for (const file of files) {
        const filePath = path.join(folder, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            readCommands(filePath);
            continue;
        }

        if (!file.endsWith(".js")) continue;

        const command = require(filePath);

        if (!command.data) continue;

        commands.push(command.data.toJSON());
    }
}

readCommands(path.join(__dirname, "../commands"));

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`🚀 Déploiement global de ${commands.length} commande(s)...`);

        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            { body: commands }
        );

        console.log("✅ Déploiement global terminé.");

    } catch (error) {
        console.error(error);
    }
})();