const test = require("node:test");
const assert = require("node:assert/strict");

const {
    stubModule
} = require("./helpers/moduleStub");
const {
    toPublicErrorMessage,
    PHONE_CALL_MESSAGES
} = require(
    "../src/v2/core/services/PublicErrorMessageService"
);

test(
    "la frontière publique conserve seulement les erreurs métier explicitement autorisées",
    () => {
        assert.equal(
            toPublicErrorMessage(
                new Error(
                    "Ce thread est verrouillé. Un membre du staff doit le rouvrir avant de pouvoir continuer ici."
                ),
                "fallback",
                PHONE_CALL_MESSAGES
            ),
            "Ce thread est verrouillé. Un membre du staff doit le rouvrir avant de pouvoir continuer ici."
        );
        assert.equal(
            toPublicErrorMessage(
                new Error(
                    "SQLITE_BUSY C:\\Greycore\\data\\db.sqlite"
                ),
                "fallback",
                PHONE_CALL_MESSAGES
            ),
            "fallback"
        );
        assert.equal(
            toPublicErrorMessage(
                "Bearer secret",
                "fallback",
                PHONE_CALL_MESSAGES
            ),
            "fallback"
        );
    }
);

test(
    "GreyFate masque une erreur réseau mais conserve son erreur métier connue",
    async () => {
        const replies = [];
        let failure = new Error(
            "fetch https://internal/path Bearer SECRET"
        );
        const duo = {
            duo_id: "duo",
            guild_id: "guild",
            thread_id: "thread",
            male_user_id: "user",
            female_user_id: "other",
            closure_prompt_sent_at: "occurrence",
            closed_at: null
        };

        stubModule(
            "src/v2/services/greyfate/GreyFateIntegrationService.js",
            {
                enabled: () => true,
                duo: () => duo,
                decodeOccurrence:
                    () => "occurrence",
                continueDuo:
                    async () => {
                        throw failure;
                    }
            }
        );
        stubModule(
            "src/v2/core/services/InteractionResponseService.js",
            {
                replyPrivate:
                    async (_interaction, message) =>
                        replies.push(message)
            }
        );

        const routerPath = require.resolve(
            "../src/v2/router/buttons/GreyFateRouter"
        );
        delete require.cache[routerPath];
        const router = require(routerPath);
        const interaction = {
            isButton: () => true,
            customId:
                "greyfate_duo_continue:duo:encoded",
            guildId: "guild",
            channelId: "thread",
            user: {
                id: "user"
            },
            memberPermissions: {
                has: () => false
            },
            deferUpdate: async () => {}
        };

        await router(interaction);
        assert.equal(
            replies.at(-1),
            "❌ L’action GreyFate n’a pas pu être effectuée."
        );
        assert.doesNotMatch(
            replies.at(-1),
            /SECRET|internal|fetch/
        );

        failure = new Error(
            "Cette scène ne peut plus être prolongée."
        );
        await router(interaction);
        assert.equal(
            replies.at(-1),
            "❌ Cette scène ne peut plus être prolongée."
        );
    }
);

test(
    "un upload de tenue masque le chemin filesystem côté utilisateur",
    async () => {
        const replies = [];
        const logs = [];

        stubModule(
            "src/v2/managers/PendingActionManager.js",
            {
                delete: () => {}
            }
        );
        stubModule(
            "src/v2/managers/OutfitV2Manager.js",
            {
                createCurrent: () => {
                    throw new Error(
                        "ENOENT C:\\Greycore\\uploads\\secret.png"
                    );
                }
            }
        );
        stubModule(
            "src/events/handlers/messageCreate/uploads/ImageAttachment.js",
            {
                getImageAttachment:
                    async () => ({
                        url: "image"
                    })
            }
        );
        stubModule(
            "src/v2/core/services/TechnicalLogger.js",
            {
                create: () => ({
                    error: (...values) =>
                        logs.push(values)
                })
            }
        );

        const handlerPath = require.resolve(
            "../src/events/handlers/messageCreate/uploads/OutfitUploadHandler"
        );
        delete require.cache[handlerPath];
        const handler = require(handlerPath);

        await handler(
            {
                author: {
                    id: "user"
                },
                reply: async value =>
                    replies.push(value)
            },
            {
                continuityId: "continuity"
            }
        );

        assert.equal(
            replies.at(-1),
            "❌ Le fichier de tenue n’a pas pu être traité."
        );
        assert.doesNotMatch(
            replies.at(-1),
            /ENOENT|Greycore|secret\.png/
        );
        assert.doesNotMatch(
            JSON.stringify(logs),
            /C:\\\\Greycore/
        );
    }
);
