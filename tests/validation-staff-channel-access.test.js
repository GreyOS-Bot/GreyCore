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
    "l’accès au salon de validation permet de traiter ses demandes",
    () => {
        stubModule(
            "src/v2/managers/GuildSettingsV2Manager.js",
            {
                getValidationChannelId:
                    guildId =>
                        guildId === "guild"
                            ? "validation-channel"
                            : null
            }
        );

        const policyPath =
            require.resolve(
                "../src/v2/core/policies/ValidationStaffPolicy"
            );

        delete require.cache[policyPath];

        const policy =
            require(
                "../src/v2/core/policies/ValidationStaffPolicy"
            );

        const interaction = {
            guildId: "guild",
            channelId: "validation-channel",
            memberPermissions: {
                has:
                    () => false
            }
        };

        assert.equal(
            policy.canReview(interaction),
            true
        );

        assert.equal(
            policy.canReview({
                ...interaction,
                channelId: "another-channel"
            }),
            false
        );

        const validationChannel = {
            permissionsFor: () => ({
                has: () => true
            })
        };

        const staffByChannel = {
            guildId: "guild",
            member: {
                id: "staff"
            },
            memberPermissions: {
                has: () => false
            },
            guild: {
                channels: {
                    cache: new Map([
                        [
                            "validation-channel",
                            validationChannel
                        ]
                    ])
                }
            }
        };

        assert.equal(
            policy.canManageServerTools(
                staffByChannel
            ),
            true
        );

        validationChannel.permissionsFor =
            () => ({
                has: () => false
            });

        assert.equal(
            policy.canManageServerTools(
                staffByChannel
            ),
            false
        );
    }
);
