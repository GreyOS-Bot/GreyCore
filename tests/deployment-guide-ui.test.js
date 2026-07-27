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
    "la configuration propose un bouton clair pour installer sur le serveur courant",
    async () => {
        const character = {
            id:
                "character",
            discord_user_id:
                "owner",
            proxy_name:
                "Alba"
        };

        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getDashboardData:
                    () => ({
                        character,
                        counts: {
                            installations:
                                1
                        }
                    })
            }
        );

        stubModule(
            "src/v2/core/policies/CharacterManagementPolicy.js",
            {
                isOwner:
                    () => true
            }
        );

        const pagePath =
            require.resolve(
                "../src/v2/pages/character/CharacterManagementCategoryPage"
            );

        delete require.cache[
            pagePath
        ];

        const page =
            require(
                "../src/v2/pages/character/CharacterManagementCategoryPage"
            );

        const interaction = {
            guildId:
                "guild",
            update:
                async payload => {
                    interaction.payload =
                        payload;
                }
        };

        await page.execute(
            interaction,
            character.id
        );

        assert.equal(
            getCustomIds(
                interaction.payload
            ).includes(
                "v2_character_deploy:character"
            ),
            true
        );

        assert.match(
            interaction.payload.embeds[0]
                .toJSON()
                .description,
            /Installer sur ce serveur/
        );
    }
);

test(
    "le choix de l’histoire mène directement à l’installation guidée",
    async () => {
        const continuityListView =
            require(
                "../src/v2/views/continuity/ContinuityListView"
            );

        const list =
            continuityListView.build(
                {
                    id:
                        "character",
                    proxy_name:
                        "Alba"
                },
                [
                    {
                        id:
                            "continuity",
                        name:
                            "GreyOS",
                        mode:
                            "original",
                        installation_count:
                            1
                    }
                ],
                {
                    mode:
                        "deployment"
                }
            );

        assert.equal(
            getCustomIds(
                list
            ).includes(
                "v2_continuity_deploy_select:character"
            ),
            true
        );

        assert.match(
            list.embeds[0]
                .toJSON()
                .description,
            /Étape 1 sur 3/
        );

        const calls = [];

        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    user: {
                        getOrCreate:
                            () => ({
                                id:
                                    "user"
                            })
                    },
                    continuity: {
                        getById:
                            () => ({
                                id:
                                    "continuity",
                                character_id:
                                    "character"
                            })
                    },
                    library: {
                        getCharacterForUser:
                            () => ({
                                id:
                                    "character",
                                proxy_name:
                                    "Alba"
                            })
                    },
                    installation: {
                        getByContinuityAndGuild:
                            () => null
                    }
                }
            }
        );

        stubModule(
            "src/v2/views/deployment/DeploymentChoiceView.js",
            {
                build: (
                    character,
                    continuity,
                    options
                ) => {
                    calls.push([
                        character,
                        continuity,
                        options
                    ]);

                    return {
                        content:
                            "choice"
                    };
                }
            }
        );

        const handlerPath =
            require.resolve(
                "../src/v2/interactions/selectMenus/selectContinuity"
            );

        delete require.cache[
            handlerPath
        ];

        const selectContinuity =
            require(
                "../src/v2/interactions/selectMenus/selectContinuity"
            );

        const interaction = {
            customId:
                "v2_continuity_deploy_select:character",
            values: [
                "continuity"
            ],
            guildId:
                "guild",
            user: {
                id:
                    "owner"
            },
            update:
                async payload => {
                    interaction.payload =
                        payload;
                }
        };

        await selectContinuity(
            interaction
        );

        assert.equal(
            interaction.payload.content,
            "choice"
        );

        assert.equal(
            calls[0][2]
                .returnCustomId,
            "v2_character_deploy:character"
        );
    }
);

function getCustomIds(
    payload
) {
    return payload.components
        .flatMap(
            row =>
                row.toJSON()
                    .components
        )
        .map(
            component =>
                component.custom_id
        );
}
