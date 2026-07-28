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
    "la fiche d’un autre joueur reste consultable sans commandes de modification",
    async () => {
        const dashboardPage =
            require(
                "../src/v2/pages/character/CharacterDashboardPage"
            );

        const character = {
            id:
                "character",
            discord_user_id:
                "owner",
            proxy_name:
                "Alba",
            character_type:
                "personnage_joue"
        };

        const visitorDashboard =
            dashboardPage.build(
                character,
                null,
                {
                    isOwner:
                        false
                }
            );

        assert.equal(
            getCustomIds(
                visitorDashboard
            ).some(
                id =>
                    id.startsWith(
                        "page:character:category:management:"
                    )
            ),
            false
        );

        const ownerDashboard =
            dashboardPage.build(
                character,
                null,
                {
                    isOwner:
                        true
                }
            );

        assert.equal(
            getCustomIds(
                ownerDashboard
            ).some(
                id =>
                    id.startsWith(
                        "page:character:category:management:"
                    )
            ),
            true
        );

        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getDashboardData:
                    () => ({
                        character,
                        continuity: {
                            id: "continuity"
                        },
                        profile: {
                            firstname:
                                "Alba",
                            age:
                                23,
                            story:
                                "Une histoire visible."
                        }
                    })
            }
        );

        stubModule(
            "src/v2/managers/InstallationV2Manager.js",
            {
                getByContinuityAndGuild: () => ({
                    id: "installation",
                    status: "approved"
                })
            }
        );

        const profilePagePath =
            require.resolve(
                "../src/v2/pages/character/CharacterProfilePage"
            );

        delete require.cache[
            profilePagePath
        ];

        const profilePage =
            require(
                "../src/v2/pages/character/CharacterProfilePage"
            );

        const interaction = {
            guildId:
                "guild",
            user: {
                id:
                    "visitor"
            },
            update:
                async payload => {
                    interaction.payload =
                        payload;
                }
        };

        await profilePage.execute(
            interaction,
            character.id
        );

        const profileIds =
            getCustomIds(
                interaction.payload
            );

        assert.equal(
            interaction.payload.components.length,
            2
        );

        assert.equal(
            interaction.payload.components.every(
                row => row.toJSON().components.length > 0
            ),
            true
        );

        assert.equal(
            profileIds.some(
                id =>
                    id.includes(
                        "_edit:"
                    )
            ),
            false
        );

        assert.equal(
            profileIds.includes(
                "v2_profile_story_view:character:0"
            ),
            true
        );

        const ownerInteraction = {
            guildId:
                "guild",
            user: {
                id:
                    "owner"
            },
            update:
                async payload => {
                    ownerInteraction.payload = payload;
                }
        };

        await profilePage.execute(
            ownerInteraction,
            character.id
        );

        assert.equal(
            getCustomIds(
                ownerInteraction.payload
            ).includes(
                "v2_installation_avatar_request:character:installation"
            ),
            true
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
