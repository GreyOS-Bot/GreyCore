const {
    initializeDatabase
} = require("../database/schema");

const databaseBackupService =
    require("../database/DatabaseBackupService");

const staffErrorLogService =
    require("../v2/services/StaffErrorLogService");

module.exports = {
    name: "clientReady",
    once: true,

    execute(client) {
        initializeDatabase();

        databaseBackupService.start();
        staffErrorLogService.initialize(client);

        console.log(
            `✅ Greycore connecté en tant que ${client.user.tag}`
        );
    }
};
