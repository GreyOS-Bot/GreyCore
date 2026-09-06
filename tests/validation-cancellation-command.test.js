const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "le staff annule une installation non aboutie sans supprimer le personnage",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/services/validation/ValidationManagerV2.js",
            {
                getInstallation: () => ({
                    validation_channel_id: null,
                    validation_message_id: null
                }),
                cancelIncompleteInstallation: data => {
                    calls.push(data);

                    return {
                        context: {
                            proxy_name: "Reya"
                        }
                    };
                }
            }
        );
        stubModule(
            "src/v2/core/services/ValidationPermissionAccessService.js",
            {
                canRead: () => true,
                canWrite: () => true
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                deferPrivate: async interaction => {
                    interaction.deferred = true;
                },
                replyPrivate: async (
                    interaction,
                    payload
                ) => {
                    interaction.payload = payload;
                }
            }
        );

        const commandPath = require.resolve(
            "../src/commands/validations"
        );
        delete require.cache[commandPath];

        const command = require(
            "../src/commands/validations"
        );
        const interaction = {
            guildId: "guild",
            user: {
                id: "staff"
            },
            options: {
                getSubcommand: () => "annuler",
                getString: name =>
                    name === "personnage"
                        ? "installation"
                        : "Création abandonnée"
            }
        };

        await command.execute(interaction);

        assert.deepEqual(
            calls,
            [
                {
                    installationId: "installation",
                    guildId: "guild",
                    cancelledBy: "staff",
                    reason: "Création abandonnée"
                }
            ]
        );
        assert.match(
            interaction.payload,
            /n’a pas été supprimé/
        );
    }
);

test(
    "la recherche d’annulation transmet aussi l’alias saisi",
    async () => {
        const searches = [];

        stubModule(
            "src/v2/core/services/ValidationPermissionAccessService.js",
            { canRead: () => true, canWrite: () => true }
        );

        stubModule(
            "src/v2/services/validation/ValidationManagerV2.js",
            {
                searchIncompleteForGuild: (
                    guildId,
                    filter
                ) => {
                    searches.push({
                        guildId,
                        filter
                    });

                    return [
                        {
                            id: 539,
                            firstname: "Story",
                            proxy_name: "Astoria",
                            lastname: null,
                            owner_id: "owner",
                            status: "pending"
                        }
                    ];
                }
            }
        );

        const commandPath = require.resolve(
            "../src/commands/validations"
        );
        delete require.cache[commandPath];
        const command = require(
            "../src/commands/validations"
        );
        let choices;

        await command.autocomplete({
            guildId: "guild",
            guild: {
                members: {
                    cache: new Map([
                        [
                            "owner",
                            {
                                displayName: "Morgane"
                            }
                        ]
                    ])
                }
            },
            options: {
                getFocused: () => ({
                    name: "personnage",
                    value: "Story"
                })
            },
            respond: async value => {
                choices = value;
            }
        });

        assert.deepEqual(
            searches,
            [
                {
                    guildId: "guild",
                    filter: "Story"
                }
            ]
        );
        assert.deepEqual(
            choices,
            [
                {
                    name:
                        "Story — Morgane — pending",
                    value: "539"
                }
            ]
        );
    }
);
