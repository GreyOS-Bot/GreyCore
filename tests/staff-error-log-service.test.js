const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");

stubModule(
    "src/v2/managers/GuildSettingsV2Manager.js",
    {}
);

const {
    StaffErrorLogService,
    buildErrorEmbed
} = require(
    "../src/v2/services/StaffErrorLogService"
);

test(
    "le journal staff d\u00e9taille l'erreur, l'action et le salon concern\u00e9",
    async () => {
        const sent = [];

        const service =
            new StaffErrorLogService({
                settingsManager: {
                    getErrorLogChannelId: () =>
                        "error-channel"
                },
                log: {
                    warn: () => {}
                }
            });

        service.initialize({
            channels: {
                cache: new Map([
                    [
                        "error-channel",
                        {
                            send: async payload =>
                                sent.push(payload)
                        }
                    ]
                ]),
                fetch: async () => null
            }
        });

        assert.equal(
            await service.report({
                guildId: "guild",
                scope: "Interaction Discord",
                error: new Error(
                    "Personnage introuvable."
                ),
                interaction: {
                    commandName: "personnage",
                    channelId: "channel-123",
                    channel: {
                        name: "tests-greycore"
                    },
                    guildId: "guild",
                    guild: {
                        name: "Serveur b\u00eata"
                    },
                    user: {
                        tag: "Sky.dkr",
                        id: "user-123"
                    }
                }
            }),
            true
        );

        const embed = sent[0].embeds[0].toJSON();

        assert.equal(
            embed.title,
            "\u26a0\ufe0f Erreur GreyCore"
        );
        assert.match(
            embed.fields[0].value,
            /Personnage introuvable/
        );
        assert.deepEqual(
            embed.fields.map(
                field => field.name
            ),
            [
                "Erreur",
                "Origine",
                "Action",
                "Salon concern\u00e9",
                "Serveur",
                "Utilisateur",
                "Trace technique"
            ]
        );
        assert.match(
            embed.fields[3].value,
            /#tests-greycore \(channel-123\)/
        );
        assert.match(
            embed.fields[4].value,
            /Serveur b\u00eata \(guild\)/
        );
        assert.match(
            embed.fields[5].value,
            /Sky\.dkr \(user-123\)/
        );
    }
);

test(
    "le journal n'envoie rien sans salon configur\u00e9",
    async () => {
        const service =
            new StaffErrorLogService({
                settingsManager: {
                    getErrorLogChannelId: () => null
                },
                log: {
                    warn: () => {}
                }
            });

        service.initialize({
            channels: {
                cache: new Map(),
                fetch: async () => {
                    throw new Error(
                        "ne doit pas \u00eatre appel\u00e9"
                    );
                }
            }
        });

        assert.equal(
            await service.report({
                guildId: "guild",
                scope: "Interaction Discord",
                error: new Error("Erreur")
            }),
            false
        );
    }
);

test(
    "l'embed masque les caract\u00e8res de bloc de code de l'erreur",
    () => {
        const embed = buildErrorEmbed({
            scope: "Test",
            error: new Error("Erreur avec `code`")
        }).toJSON();

        assert.doesNotMatch(
            embed.fields[0].value.slice(3, -3),
            /`/
        );
    }
);
