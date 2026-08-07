const fs = require("fs");
const path = require("path");

const PUBLIC_SLASH_COMMANDS = new Set([
    "greycore",
    "personnage",
    "staff",
    "phone"
]);

function isContextMenuCommand(commandData) {
    return commandData?.type === 2
        || commandData?.type === 3;
}

function shouldDeploy(commandData) {
    if (!commandData) return false;

    if (isContextMenuCommand(commandData)) {
        return true;
    }

    return PUBLIC_SLASH_COMMANDS.has(
        commandData.name
    );
}

function collectDeployableCommands(commandsPath) {
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

            const commandData = command.data.toJSON();

            if (shouldDeploy(commandData)) {
                commands.push(commandData);
            }
        }
    }

    readCommands(commandsPath);

    return commands;
}

module.exports = {
    PUBLIC_SLASH_COMMANDS,
    isContextMenuCommand,
    shouldDeploy,
    collectDeployableCommands
};
