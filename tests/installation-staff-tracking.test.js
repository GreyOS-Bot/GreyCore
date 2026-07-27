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
    "le suivi staff est créé puis mis à jour dans un seul message",
    async () => {
        const calls = [];

        let storedMessage =
            null;

        let fetchedMessage =
            null;

        const installation = {
            id:
                "installation",
            status:
                "draft",
            owner_id:
                "owner"
        };

        stubModule(
            "src/v2/managers/GuildSettingsV2Manager.js",
            {
                getValidationChannelId:
                    () =>
                        "staff-channel"
            }
        );

        stubModule(
            "src/v2/managers/InstallationMessageV2Manager.js",
            {
                getByInstallationId:
                    () =>
                        storedMessage,
                save:
                    data => {
                        calls.push([
                            "save",
                            data
                        ]);

                        storedMessage = {
                            channel_id:
                                data.channelId,
                            message_id:
                                data.messageId
                        };

                        return storedMessage;
                    }
            }
        );

        stubModule(
            "src/v2/services/validation/ValidationManagerV2.js",
            {
                getInstallationContext:
                    () =>
                        installation
            }
        );

        stubModule(
            "src/v2/builders/ValidationCardBuilder.js",
            {
                build:
                    data => {
                        calls.push([
                            "build",
                            data
                        ]);

                        return {
                            content:
                                `status:${data.installation.status}`
                        };
                    }
            }
        );

        const sentMessage = {
            id:
                "staff-message"
        };

        const channel = {
            id:
                "staff-channel",
            isTextBased:
                () => true,
            messages: {
                fetch:
                    async () =>
                        fetchedMessage
            },
            send:
                async payload => {
                    calls.push([
                        "send",
                        payload
                    ]);

                    return sentMessage;
                }
        };

        const guild = {
            id:
                "guild",
            name:
                "GreyCore",
            channels: {
                fetch:
                    async () =>
                        channel
            }
        };

        const servicePath =
            require.resolve(
                "../src/v2/services/validation/InstallationStaffTrackingService"
            );

        delete require.cache[
            servicePath
        ];

        const service =
            require(
                "../src/v2/services/validation/InstallationStaffTrackingService"
            );

        await service.sync({
            guild,
            installationId:
                installation.id,
            requesterId:
                "owner"
        });

        fetchedMessage = {
            id:
                sentMessage.id,
            edit:
                async payload => {
                    calls.push([
                        "edit",
                        payload
                    ]);
                }
        };

        installation.status =
            "pending";

        await service.sync({
            guild,
            installationId:
                installation.id,
            requesterId:
                "owner"
        });

        assert.equal(
            countCalls(
                calls,
                "send"
            ),
            1
        );

        assert.equal(
            countCalls(
                calls,
                "edit"
            ),
            1
        );

        assert.equal(
            countCalls(
                calls,
                "save"
            ),
            2
        );

        assert.equal(
            calls.find(
                call =>
                    call[0] ===
                        "build"
            )[1]
                .requesterDisplay,
            "<@owner>"
        );
    }
);

test(
    "la carte staff détaille les étapes et le type réel du personnage",
    () => {
        const builderPath =
            require.resolve(
                "../src/v2/builders/ValidationCardBuilder"
            );

        delete require.cache[
            builderPath
        ];

        const builder =
            require(
                "../src/v2/builders/ValidationCardBuilder"
            );

        const draftCard =
            builder.build({
                installation: {
                    id:
                        42,
                    status:
                        "draft",
                    proxy_name:
                        "Javier",
                    character_type:
                        "pnj",
                    firstname:
                        "Javier",
                    age:
                        30,
                    story_name:
                        "GreyOS",
                    guild_name:
                        "GreyCore",
                    proxy_enabled:
                        0,
                    created_at:
                        "2026-07-26T20:00:00.000Z"
                },
                guildName:
                    "GreyCore",
                requesterDisplay:
                    "<@owner>"
            });

        const draftJson =
            draftCard.embeds[0]
                .toJSON();

        assert.match(
            getField(
                draftJson,
                "Étape 2"
            ).value,
            /attente de l’avatar/
        );

        assert.match(
            getField(
                draftJson,
                "Étape 3"
            ).name,
            /⬜/
        );

        assert.match(
            getField(
                draftJson,
                "Informations du personnage"
            ).value,
            /\*\*Type :\*\* PNJ/
        );

        const pendingCard =
            builder.build({
                installation: {
                    id:
                        42,
                    status:
                        "pending",
                    proxy_name:
                        "Javier",
                    character_type:
                        "pnj",
                    firstname:
                        "Javier",
                    age:
                        30,
                    story_name:
                        "GreyOS",
                    guild_name:
                        "GreyCore",
                    proxy_enabled:
                        0,
                    local_avatar_url:
                        "https://image.test/javier.png",
                    submitted_at:
                        "2026-07-26T20:10:00.000Z"
                },
                guildName:
                    "GreyCore",
                requesterDisplay:
                    "<@owner>"
            });

        const pendingJson =
            pendingCard.embeds[0]
                .toJSON();

        assert.match(
            getField(
                pendingJson,
                "Étape 2"
            ).value,
            /Avatar reçu/
        );

        assert.match(
            getField(
                pendingJson,
                "Étape 3"
            ).value,
            /En attente du staff/
        );

        assert.match(
            getField(
                pendingJson,
                "Étape 3"
            ).name,
            /🟨/
        );

        assert.equal(
            pendingCard.components.length,
            1
        );

        const approvedCard =
            builder.build({
                installation: {
                    id:
                        42,
                    status:
                        "approved",
                    proxy_name:
                        "Javier",
                    character_type:
                        "pnj",
                    firstname:
                        "Javier",
                    age:
                        30,
                    story_name:
                        "GreyOS",
                    guild_name:
                        "GreyCore",
                    proxy_enabled:
                        1,
                    approved_by:
                        "33412153137990410",
                    approved_at:
                        "2026-07-26T20:10:00.000Z"
                },
                guildName:
                    "GreyCore",
                requesterDisplay:
                    "<@owner>"
            });

        assert.match(
            getField(
                approvedCard.embeds[0].toJSON(),
                "Validation du staff"
            ).value,
            /<@33412153137990410>/
        );
    }
);

function countCalls(
    calls,
    name
) {
    return calls.filter(
        call =>
            call[0] === name
    ).length;
}

function getField(
    embed,
    partialName
) {
    return embed.fields
        .find(
            field =>
                field.name
                    .includes(
                        partialName
                    )
        );
}
