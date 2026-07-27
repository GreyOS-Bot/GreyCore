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
    "la suppression retire une seule installation et conserve la continuité",
    async () => {
        const installations =
            new Map([
                [
                    1,
                    {
                        id:
                            1,
                        character_id:
                            "character",
                        continuity_id:
                            "continuity",
                        guild_id:
                            "guild-a",
                        status:
                            "approved"
                    }
                ],
                [
                    2,
                    {
                        id:
                            2,
                        character_id:
                            "character",
                        continuity_id:
                            "continuity",
                        guild_id:
                            "guild-b",
                        status:
                            "approved"
                    }
                ]
            ]);

        const calls = [];

        stubModule(
            "src/v2/index.js",
            {
                managers: {
                    installation: {
                        getById:
                            installationId =>
                                installations
                                    .get(
                                        installationId
                                    )
                                || null,
                        delete:
                            installationId => {
                                calls.push([
                                    "delete",
                                    installationId
                                ]);

                                installations
                                    .delete(
                                        installationId
                                    );
                            }
                    },
                    continuity: {
                        getById:
                            () => ({
                                id:
                                    "continuity",
                                name:
                                    "GreyOS"
                            })
                    },
                    character: {
                        getById:
                            () => ({
                                id:
                                    "character",
                                proxy_name:
                                    "Alba",
                                discord_user_id:
                                    "owner"
                            })
                    },
                    installationMessage: {
                        getByInstallationId:
                            () => null
                    }
                }
            }
        );

        stubModule(
            "src/v2/views/installation/InstallationDetailView.js",
            {
                build:
                    context => ({
                        content:
                            `open:${context.installation.id}`
                    }),
                confirmDelete:
                    context => ({
                        content:
                            `confirm:${context.installation.id}`
                    }),
                deleted:
                    context => ({
                        content:
                            `deleted:${context.installation.id}`
                    })
            }
        );

        const handler =
            require(
                "../src/v2/interactions/installations/InstallationManagementHandler"
            );

        const interaction =
            createInteraction(
                "owner"
            );

        await handler.open(
            interaction,
            1
        );

        assert.equal(
            interaction.updated
                .content,
            "open:1"
        );

        await handler.confirmDelete(
            interaction,
            1
        );

        assert.equal(
            interaction.updated
                .content,
            "confirm:1"
        );

        await handler.deleteConfirmed(
            interaction,
            1
        );

        assert.deepEqual(
            calls,
            [
                [
                    "delete",
                    1
                ]
            ]
        );

        assert.equal(
            installations.has(
                1
            ),
            false
        );

        assert.equal(
            installations.has(
                2
            ),
            true
        );

        assert.equal(
            interaction.updated
                .content,
            "deleted:1"
        );
    }
);

test(
    "le staff ne peut pas supprimer l’installation globale d’un autre joueur",
    async () => {
        const handler =
            require(
                "../src/v2/interactions/installations/InstallationManagementHandler"
            );

        const interaction =
            createInteraction(
                "staff",
                permission =>
                    permission ===
                    PermissionsBitField
                        .Flags
                        .ManageGuild
            );

        await handler.deleteConfirmed(
            interaction,
            2
        );

        assert.match(
            interaction
                .replied
                .content,
            /ne peux pas gérer/
        );
    }
);

test(
    "les boutons d’installation ouvrent la fiche et le parcours de création",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/interactions/installations/InstallationManagementHandler.js",
            {
                open:
                    async (
                        interaction,
                        installationId
                    ) => {
                        calls.push([
                            "open",
                            installationId
                        ]);
                    },
                confirmDelete:
                    async () => {},
                deleteConfirmed:
                    async () => {}
            }
        );

        stubModule(
            "src/v2/interactions/buttons/openStoryDeploy.js",
            async interaction => {
                calls.push([
                    "create",
                    interaction
                        .customId
                        .split(":")[1]
                ]);
            }
        );

        const routerPath =
            require.resolve(
                "../src/v2/router/buttons/LibraryRouter"
            );

        delete require.cache[
            routerPath
        ];

        const router =
            require(
                "../src/v2/router/buttons/LibraryRouter"
            );

        assert.equal(
            await router({
                isButton:
                    () => true,
                customId:
                    "v2_installation_open:12"
            }),
            true
        );

        assert.equal(
            await router({
                isButton:
                    () => true,
                customId:
                    "v2_installation_create:continuity"
            }),
            true
        );

        assert.deepEqual(
            calls,
            [
                [
                    "open",
                    "12"
                ],
                [
                    "create",
                    "continuity"
                ]
            ]
        );
    }
);

function createInteraction(
    userId,
    permissionCheck =
        () => false
) {
    return {
        guildId:
            "guild-a",
        user: {
            id:
                userId
        },
        memberPermissions: {
            has:
                permissionCheck
        },
        client: {
            guilds: {
                cache:
                    new Map([
                        [
                            "guild-a",
                            {
                                name:
                                    "Serveur A"
                            }
                        ],
                        [
                            "guild-b",
                            {
                                name:
                                    "Serveur B"
                            }
                        ]
                    ])
            },
            channels: {
                fetch:
                    async () => null
            }
        },
        inGuild:
            () => true,
        reply:
            async function (
                payload
            ) {
                this.replied =
                    payload;
            },
        update:
            async function (
                payload
            ) {
                this.updated =
                    payload;
            }
    };
}
