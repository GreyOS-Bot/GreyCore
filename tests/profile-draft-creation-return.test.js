const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "une modification de brouillon ram\u00e8ne \u00e0 la cr\u00e9ation plut\u00f4t qu'\u00e0 la fiche finale",
    async () => {
        const calls = [];

        stubDependencies(calls);

        clearModules();

        const {
            submitInformation
        } = require(
            "../src/v2/interactions/profile/ProfileEditSubmissionHandler"
        );

        const interaction = {
            guildId: "guild",
            guild: {
                id: "guild",
                name: "Serveur b\u00eata"
            },
            message: {
                id: "creation-message"
            },
            user: {
                id: "owner"
            },
            fields: {
                getTextInputValue: fieldId => ({
                    origin: "Los Santos",
                    occupation: "Artiste",
                    gang: "Sans",
                    height: "1m70",
                    weight: "58 kg"
                })[fieldId] || ""
            },
            update: async payload => {
                interaction.updated = payload;
            }
        };

        await submitInformation(
            interaction,
            "character"
        );

        assert.equal(
            calls.some(
                call =>
                    call[0] === "profile.update"
            ),
            true
        );
        assert.deepEqual(
            interaction.updated,
            {
                content: "Continuer la cr\u00e9ation"
            }
        );
        assert.equal(
            calls.some(
                call =>
                    call[0] === "profile.page"
            ),
            false
        );
    }
);

function stubDependencies(calls) {
    stubModule(
        "src/v2/services/dashboard/CharacterDashboardManager.js",
        {
            getDashboardData: () => ({
                character: {
                    id: "character",
                    discord_user_id: "owner",
                    avatar_url: null
                },
                continuity: {
                    id: "continuity"
                },
                profile: {
                    continuity_id: "continuity"
                }
            })
        }
    );
    stubModule(
        "src/v2/managers/ProfileV2Manager.js",
        {
            getOrCreate: () => {},
            update: (
                continuityId,
                changes
            ) => calls.push([
                "profile.update",
                continuityId,
                changes
            ])
        }
    );
    stubModule(
        "src/v2/managers/InstallationV2Manager.js",
        {
            getByContinuityAndGuild: () => ({
                id: "installation",
                status: "draft",
                local_avatar_url: null
            })
        }
    );
    stubModule(
        "src/v2/views/character/CharacterAvatarRequiredView.js",
        {
            build: () => ({
                content: "Continuer la cr\u00e9ation"
            })
        }
    );
    stubModule(
        "src/v2/views/deployment/InstallationCreatedView.js",
        {
            build: () => ({
                content: "Poursuivre la cr\u00e9ation"
            })
        }
    );
    stubModule(
        "src/v2/pages/character/CharacterProfilePage.js",
        {
            execute: async () => calls.push([
                "profile.page"
            ])
        }
    );
    stubModule(
        "src/v2/managers/CharacterChangeRequestV2Manager.js",
        {
            types: {
                PROFILE_IDENTITY: "identity",
                PROFILE_INFORMATION: "information",
                PROFILE_STORY: "story"
            }
        }
    );
}

function clearModules() {
    for (
        const modulePath of [
            "../src/v2/interactions/profile/ProfileEditAccessService",
            "../src/v2/interactions/profile/ProfileEditSubmissionHandler"
        ]
    ) {
        delete require.cache[
            require.resolve(modulePath)
        ];
    }
}
