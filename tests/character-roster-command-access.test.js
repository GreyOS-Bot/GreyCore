const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    stubModule
} = require(
    "./helpers/moduleStub"
);

test(
    "la liste des personnages est publique tandis que leur gestion reste staff",
    async () => {
        let staffAccessChecks = 0;

        stubModule(
            "src/v2/managers/CharacterRosterV2Manager.js",
            {
                getRoster:
                    () => [
                        {
                            firstname:
                                "Alba",
                            discord_user_id:
                                "owner-a",
                            character_type:
                                "personnage_joue",
                            is_archived:
                                false
                        },
                        {
                            firstname:
                                "Alba",
                            discord_user_id:
                                "owner-b",
                            character_type:
                                "personnage_joue",
                            is_archived:
                                false
                        },
                        {
                            firstname:
                                "Vega",
                            discord_user_id:
                                "owner-v",
                            character_type:
                                "pnj",
                            is_archived:
                                false
                        }
                    ]
            }
        );

        stubModule(
            "src/v2/services/deployment/DeploymentV2Service.js",
            {
                deployAllExisting:
                    () => ({ total: 0 })
            }
        );

        stubModule(
            "src/v2/core/services/StaffCommandAccessService.js",
            {
                requireStaffCommandAccess:
                    async () => {
                        staffAccessChecks += 1;
                        return false;
                    }
            }
        );

        const commandPath =
            require.resolve(
                "../src/commands/personnages"
            );

        delete require.cache[
            commandPath
        ];

        const command =
            require(
                "../src/commands/personnages"
            );

        const listOptions =
            command.data.toJSON()
                .options.find(option =>
                    option.name === "liste"
                )
                .options;

        assert.equal(
            listOptions.some(option =>
                option.name === "page"
            ),
            false
        );

        assert.equal(
            listOptions.some(option =>
                option.name === "lettre"
                && option.autocomplete === true
                && option.required === false
            ),
            true
        );

        assert.equal(
            command.data.toJSON()
                .options.some(option =>
                    option.name === "deployer-tous"
                ),
            true
        );

        const listInteraction =
            createInteraction("liste");

        await command.execute(
            listInteraction
        );

        assert.equal(
            staffAccessChecks,
            0
        );

        assert.match(
            listInteraction.replyPayload
                .embeds[0]
                .toJSON()
                .title,
            /Personnages du serveur — A/
        );

        assert.match(
            listInteraction.replyPayload
                .embeds[0]
                .toJSON()
                .description,
            /Alba/
        );
        assert.match(
            listInteraction.replyPayload
                .embeds[0]
                .toJSON()
                .description,
            /<@owner-a>/
        );
        assert.match(
            listInteraction.replyPayload
                .embeds[0]
                .toJSON()
                .description,
            /<@owner-b>/
        );

        assert.doesNotMatch(
            listInteraction.replyPayload
                .embeds[0]
                .toJSON()
                .description,
            /Vega/
        );

        const allInteraction =
            createInteraction("liste");

        allInteraction.options.getString =
            () => null;

        await command.execute(allInteraction);

        assert.match(
            allInteraction.replyPayload
                .embeds[0]
                .toJSON()
                .description,
            /Vega/
        );

        let autocompleteChoices;

        await command.autocomplete({
            options: {
                getFocused:
                    () => ({
                        name:
                            "lettre",
                        value:
                            "é"
                    })
            },
            respond: async choices => {
                autocompleteChoices = choices;
            }
        });

        assert.deepEqual(
            autocompleteChoices,
            [
                {
                    name:
                        "Lettre E",
                    value:
                        "E"
                }
            ]
        );

        const archiveInteraction =
            createInteraction("archiver");

        await command.execute(
            archiveInteraction
        );

        assert.equal(
            staffAccessChecks,
            1
        );
    }
);

test(
    "le dÃ©ploiement groupÃ© est rÃ©servÃ© au staff et utilise le serveur courant",
    async () => {
        let receivedData = null;

        stubModule(
            "src/v2/services/deployment/DeploymentV2Service.js",
            {
                deployAllExisting:
                    data => {
                        receivedData = data;

                        return {
                            total: 2
                        };
                    }
            }
        );

        stubModule(
            "src/v2/core/services/StaffCommandAccessService.js",
            {
                requireStaffCommandAccess:
                    async () => true
            }
        );

        const commandPath =
            require.resolve(
                "../src/commands/personnages"
            );

        delete require.cache[
            commandPath
        ];

        const command =
            require(
                "../src/commands/personnages"
            );

        const interaction =
            createInteraction(
                "deployer-tous"
            );

        interaction.user = {
            id: "staff"
        };
        interaction.guild = {
            name: "Serveur Beta"
        };

        await command.execute(
            interaction
        );

        assert.deepEqual(
            receivedData,
            {
                guildId: "guild",
                guildName: "Serveur Beta",
                approvedBy: "staff"
            }
        );
        assert.match(
            interaction.replyPayload.content,
            /2/
        );
        assert.match(
            interaction.replyPayload.content,
            /jouables/
        );
    }
);

function createInteraction(subcommand) {
    const interaction = {
        guildId:
            "guild",
        options: {
            getSubcommand:
                () => subcommand,
            getInteger:
                () => null,
            getUser:
                () => ({ id: "owner" }),
            getBoolean:
                () => false,
            getString:
                () => "A"
        },
        inGuild:
            () => true,
        reply: async payload => {
            interaction.replyPayload = payload;
        }
    };

    return interaction;
}
