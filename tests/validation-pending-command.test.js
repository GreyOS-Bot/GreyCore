const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "le staff peut consulter les validations en attente et ouvrir leur demande",
    async () => {
        const calls = [];

        stubModule(
            "src/v2/services/validation/ValidationManagerV2.js",
            {
                getPendingForGuild: guildId => {
                    calls.push([
                        "pending",
                        guildId
                    ]);

                    return [
                        {
                            id: 42,
                            proxy_name: "Reya",
                            owner_id: "owner",
                            continuity_name: "GreyOS",
                            submitted_at:
                                "2026-07-27T15:00:00.000Z",
                            validation_channel_id:
                                "channel",
                            validation_message_id:
                                "message"
                        }
                    ];
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
                replyPrivate: async (
                    interaction,
                    payload
                ) => {
                    interaction.payload = payload;
                }
            }
        );

        const commandPath =
            require.resolve(
                "../src/commands/validations"
            );

        delete require.cache[commandPath];

        const command =
            require(
                "../src/commands/validations"
            );

        const interaction = {
            guildId: "guild"
        };

        await command.execute(interaction);

        const embed =
            interaction.payload.embeds[0].toJSON();

        assert.deepEqual(
            calls,
            [
                [
                    "pending",
                    "guild"
                ]
            ]
        );
        assert.match(
            embed.description,
            /\*\*Reya\*\*/
        );
        assert.match(
            embed.description,
            /<@owner>/
        );
        assert.match(
            embed.description,
            /https:\/\/discord\.com\/channels\/guild\/channel\/message/
        );
    }
);

test(
    "la liste indique clairement lorsqu’aucune validation n’est en attente",
    () => {
        const {
            buildPendingView
        } = require(
            "../src/commands/validations"
        );

        const embed = buildPendingView(
            "guild",
            []
        ).embeds[0].toJSON();

        assert.match(
            embed.description,
            /Aucune demande/
        );
        assert.equal(
            embed.footer.text,
            "Tout est à jour"
        );
    }
);
