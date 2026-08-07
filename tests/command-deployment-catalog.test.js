const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
    PUBLIC_SLASH_COMMANDS,
    collectDeployableCommands,
    shouldDeploy
} = require(
    "../src/deploy/CommandDeploymentCatalog"
);

test(
    "le déploiement Discord ne publie que les points d'entrée UX",
    () => {
        const commands = collectDeployableCommands(
            path.join(__dirname, "../src/commands")
        );

        const slashNames = commands
            .filter(command => command.type === 1)
            .map(command => command.name)
            .sort();

        assert.deepEqual(
            slashNames,
            [...PUBLIC_SLASH_COMMANDS].sort()
        );
    }
);

test(
    "les menus contextuels restent disponibles dans Discord",
    () => {
        const commands = collectDeployableCommands(
            path.join(__dirname, "../src/commands")
        );

        const contextNames = commands
            .filter(command => command.type === 2 || command.type === 3)
            .map(command => command.name)
            .sort();

        assert.deepEqual(
            contextNames,
            [
                "Modifier le proxy",
                "Supprimer le proxy",
                "Voir la fiche"
            ]
        );
    }
);

test(
    "une ancienne commande reste masquée sans être supprimée du code",
    () => {
        assert.equal(
            shouldDeploy({
                type: 1,
                name: "config"
            }),
            false
        );

        assert.equal(
            shouldDeploy({
                type: 3,
                name: "Voir la fiche"
            }),
            true
        );
    }
);
