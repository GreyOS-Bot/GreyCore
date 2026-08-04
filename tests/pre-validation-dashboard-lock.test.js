const test = require("node:test");
const assert = require("node:assert/strict");

const { stubModule } =
    require("./helpers/moduleStub");

test(
    "un personnage non valide revient au parcours de validation sans ouvrir les fonctionnalites",
    async () => {
        let dashboardBuilt = false;

        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getDashboardData: () => ({
                    character: {
                        id: "character",
                        owner_user_id: 1,
                        avatar_url: "https://avatar.test/image.png"
                    },
                    continuity: {
                        id: "continuity"
                    },
                    counts: {}
                })
            }
        );
        stubModule(
            "src/v2/core/policies/CharacterManagementPolicy.js",
            { isOwner: () => true }
        );
        stubModule(
            "src/v2/managers/GuildModuleV2Manager.js",
            { getConfiguration: () => [] }
        );
        stubModule(
            "src/v2/managers/InstallationV2Manager.js",
            {
                getByContinuityAndGuild: () => ({
                    id: 7,
                    status: "draft",
                    local_avatar_url: null
                })
            }
        );
        stubModule(
            "src/v2/views/deployment/InstallationCreatedView.js",
            {
                build: () => ({
                    content: "validation-flow"
                })
            }
        );
        stubModule(
            "src/v2/views/character/CharacterAvatarRequiredView.js",
            {
                build: () => ({
                    content: "avatar-flow"
                })
            }
        );
        stubModule(
            "src/v2/pages/character/CharacterDashboardPage.js",
            {
                build: () => {
                    dashboardBuilt = true;
                    return {};
                }
            }
        );

        const pagePath = require.resolve(
            "../src/v2/pages/character/OpenCharacterDashboardPage"
        );
        delete require.cache[pagePath];

        const page = require(pagePath);
        const interaction = {
            guildId: "guild",
            guild: {
                id: "guild",
                name: "Greyline"
            },
            update: async payload => {
                interaction.payload = payload;
            }
        };

        await page.execute(
            interaction,
            "character"
        );

        assert.equal(
            interaction.payload.content,
            "validation-flow"
        );
        assert.equal(dashboardBuilt, false);
    }
);
