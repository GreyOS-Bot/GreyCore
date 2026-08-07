require("dotenv").config();

const path = require("path");
const { REST, Routes } = require("discord.js");
const {
    collectDeployableCommands
} = require("./CommandDeploymentCatalog");

const commands = collectDeployableCommands(
    path.join(__dirname, "../commands")
);

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
