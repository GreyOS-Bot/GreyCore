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
    "le journal staff transmet une erreur inattendue dans le salon configuré",
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
                    user: {
                        tag: "Sky.dkr"
                    }
                }
            }),
            true
        );

        const embed = sent[0].embeds[0].toJSON();

        assert.equal(
            embed.title,
            "⚠️ Erreur GreyCore"
        );
        assert.match(
            embed.description,
            /Personnage introuvable/
        );
        assert.deepEqual(
            embed.fields.map(
                field => field.name
            ),
            [
                "Origine",
                "Action",
                "Utilisateur"
            ]
        );
    }
);

test(
    "le journal n’envoie rien sans salon configuré",
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
                    throw new Error("ne doit pas être appelé");
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
    "l’embed masque les caractères de bloc de code de l’erreur",
    () => {
        const embed = buildErrorEmbed({
            scope: "Test",
            error: new Error("Erreur avec `code`")
        }).toJSON();

        assert.doesNotMatch(
            embed.description.slice(3, -3),
            /`/
        );
    }
);
