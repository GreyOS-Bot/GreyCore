const test =
    require("node:test");

const assert =
    require("node:assert/strict");

test(
    "la commande personnelle est distincte de la bibliothèque publique du serveur",
    () => {
        const command =
            require(
                "../src/commands/personnage"
            );

        const personalCommand =
            require(
                "../src/commands/mes"
            );

        const subcommands =
            command.data.toJSON()
                .options.map(option =>
                    option.name
                );

        assert.equal(
            subcommands.includes(
                "mes-personnages"
            ),
            false
        );

        assert.equal(
            subcommands.includes("liste"),
            false
        );

        assert.equal(
            personalCommand.data.name,
            "mes"
        );

        assert.equal(
            personalCommand.data.toJSON()
                .options.some(option =>
                    option.name === "personnages"
                ),
            true
        );
    }
);
