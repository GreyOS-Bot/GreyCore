const {
    initializeDatabase
} = require("../database/schema");

const databaseBackupService =
    require("../database/DatabaseBackupService");

const staffErrorLogService =
    require("../v2/services/StaffErrorLogService");

const relationshipManager =
    require("../managers/RelationshipManager");

const sceneInactivityService =
    require("../v2/services/scenes/SceneInactivityService");

module.exports = {
    name: "clientReady",
    once: true,

    execute(client) {
        initializeDatabase();

        for (
            const guild
            of client.guilds?.cache?.values?.()
            || []
        ) {
            if (
                relationshipManager
                    .getRelationshipTypes(guild.id)
                    .length > 0
            ) {
                relationshipManager
                    .installDefaultRelationshipTypes(
                        guild.id
                    );
            }
        }

        databaseBackupService.start();
        staffErrorLogService.initialize(client);
        sceneInactivityService.start(client);

        console.log(
            `✅ Greycore connecté en tant que ${client.user.tag}`
        );
    }
};
