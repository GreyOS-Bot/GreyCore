require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials
} = require("discord.js");

const loadEvents = require("./loaders/eventLoader");
const loadCommands = require("./loaders/commandLoader");
const { startGreyOSProjectionPublisher } = require(
    "./integrations/greyos/ProductProjectionPublisher.cjs"
);
const greyCoreDatabase = require("./database/database");
const logger = require("./v2/core/services/TechnicalLogger")
    .create("GreyOSProjection");
const shutdownLogger =
    require("./v2/core/services/TechnicalLogger")
        .create("GracefulShutdown");
const {
    GracefulShutdownService
} = require(
    "./v2/core/services/GracefulShutdownService"
);
const sceneInactivityService = require(
    "./v2/services/scenes/SceneInactivityService"
);
const narrativeEntityEventScheduler = require(
    "./v2/services/entities/NarrativeEntityEventScheduler"
);
const greyFateIntegrationService = require(
    "./v2/services/greyfate/GreyFateIntegrationService"
);
const databaseBackupService = require(
    "./database/DatabaseBackupService"
);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

loadEvents(client);
loadCommands(client);

let greyOSProjectionPublisher;

const gracefulShutdown =
    new GracefulShutdownService({
        greyFateService:
            greyFateIntegrationService,
        sceneInactivityService,
        narrativeEntityScheduler:
            narrativeEntityEventScheduler,
        databaseBackupService,
        getProductProjectionPublisher:
            () => greyOSProjectionPublisher,
        client,
        database:
            greyCoreDatabase,
        log:
            shutdownLogger
    });

gracefulShutdown.installProcessHandlers();

const startProjectionPublisher = () => {
    try {
        greyOSProjectionPublisher = startGreyOSProjectionPublisher({
            client,
            database: greyCoreDatabase,
            productVersion: require("../package.json").version,
            onState: state => {
                if (state.status === "degraded") {
                    logger.warn(
                        "Projection GreyOS dégradée.",
                        state.errorCode || "PUBLISH_FAILED"
                    );
                }
            }
        });
    } catch (error) {
        logger.error(
            "Connecteur GreyOS désactivé.",
            error instanceof Error ? error.message : "CONFIGURATION_INVALID"
        );
    }
};

if (client.isReady()) {
    startProjectionPublisher();
} else {
    client.once("clientReady", startProjectionPublisher);
}

client.login(process.env.TOKEN);
