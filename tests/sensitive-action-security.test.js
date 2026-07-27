const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    PermissionsBitField
} = require("discord.js");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "la création d’état exige un personnage jouable et un type du serveur",
    async () => {
        const calls = [];
        let dashboardData = null;
        let stateTypeGuildId =
            "other-guild";

        stubModule(
            "src/v2/services/dashboard/CharacterDashboardManager.js",
            {
                getPlayableDashboardData:
                    () => dashboardData
            }
        );

        stubModule(
            "src/v2/managers/StateTypeV2Manager.js",
            {
                getStateTypeById:
                    stateTypeId => ({
                        id:
                            stateTypeId,
                        guildId:
                            stateTypeGuildId
                    })
            }
        );

        stubModule(
            "src/v2/managers/StateV2Manager.js",
            {
                create:
                    data => {
                        calls.push([
                            "create",
                            data
                        ]);
                    }
            }
        );

        stubModule(
            "src/v2/pages/character/CharacterStatesPage.js",
            {
                execute:
                    async (
                        interaction,
                        characterId
                    ) => {
                        calls.push([
                            "page",
                            characterId
                        ]);
                    }
            }
        );

        const createState =
            require(
                "../src/v2/interactions/modals/createState"
            );

        const unavailableInteraction =
            createStateInteraction();

        await createState(
            unavailableInteraction
        );

        assert.match(
            unavailableInteraction
                .replied
                .content,
            /n’est pas jouable/
        );

        assert.deepEqual(
            calls,
            []
        );

        dashboardData = {
            character: {
                id:
                    "character",
                discord_user_id:
                    "user"
            },
            continuity: {
                id:
                    "continuity"
            }
        };

        const foreignTypeInteraction =
            createStateInteraction();

        await createState(
            foreignTypeInteraction
        );

        assert.match(
            foreignTypeInteraction
                .replied
                .content,
            /n’appartient pas à ce serveur/
        );

        assert.deepEqual(
            calls,
            []
        );

        stateTypeGuildId =
            "guild";

        await createState(
            createStateInteraction()
        );

        assert.equal(
            calls[0][0],
            "create"
        );

        assert.equal(
            calls[0][1]
                .guildId,
            "guild"
        );

        assert.deepEqual(
            calls[1],
            [
                "page",
                "character"
            ]
        );
    }
);

test(
    "le staff d’un serveur ne peut pas supprimer un personnage global",
    async () => {
        let deleteCount = 0;

        stubModule(
            "src/v2/managers/CharacterV2Manager.js",
            {
                getById:
                    () => ({
                        id:
                            "character",
                        discord_user_id:
                            "owner"
                    }),
                delete:
                    () => {
                        deleteCount +=
                            1;
                    }
            }
        );

        const characterDeletePage =
            require(
                "../src/v2/pages/character/CharacterDeletePage"
            );

        const interaction = {
            guildId:
                "guild",
            user: {
                id:
                    "staff"
            },
            memberPermissions: {
                has:
                    permission =>
                        permission ===
                        PermissionsBitField
                            .Flags
                            .ManageGuild
            },
            update:
                async function (
                    payload
                ) {
                    this.updated =
                        payload;
                }
        };

        await characterDeletePage
            .execute(
                interaction,
                "character"
            );

        assert.match(
            interaction
                .updated
                .content,
            /ne peux pas supprimer/
        );

        assert.equal(
            deleteCount,
            0
        );
    }
);

function createStateInteraction() {
    return {
        customId:
            "v2_state_create:character:9",
        guildId:
            "guild",
        user: {
            id:
                "user"
        },
        fields: {
            getTextInputValue:
                () => ""
        },
        inGuild:
            () => true,
        reply:
            async function (
                payload
            ) {
                this.replied =
                    payload;
            }
    };
}
