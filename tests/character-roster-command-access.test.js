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

        assert.doesNotMatch(
            listInteraction.replyPayload
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

function createInteraction(subcommand) {
    const interaction = {
        guildId:
            "guild",
        options: {
            getSubcommand:
                () => subcommand,
            getInteger:
                () => null,
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
