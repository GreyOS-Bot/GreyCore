const fs = require("fs");
const path = require("path");

const database = require("./database");

const logger =
    require("../v2/core/services/TechnicalLogger")
        .create("DatabaseBackupService");

const DEFAULT_INTERVAL_HOURS = 6;
const DEFAULT_MAXIMUM_BACKUPS = 14;
const BACKUP_FILE_PATTERN =
    /^greycore-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}\.sqlite$/;

class DatabaseBackupService {

    constructor({
        databaseConnection = database,
        fileSystem = fs,
        backupDirectory = path.resolve(
            __dirname,
            "../../data/backups"
        ),
        intervalHours = readPositiveInteger(
            process.env.GREYCORE_BACKUP_INTERVAL_HOURS,
            DEFAULT_INTERVAL_HOURS,
            168
        ),
        maximumBackups = readPositiveInteger(
            process.env.GREYCORE_BACKUP_MAX_FILES,
            DEFAULT_MAXIMUM_BACKUPS,
            100
        ),
        schedule = setInterval,
        cancelSchedule = clearInterval,
        log = logger
    } = {}) {
        this.database = databaseConnection;
        this.fileSystem = fileSystem;
        this.backupDirectory = backupDirectory;
        this.intervalMs = intervalHours * 60 * 60 * 1000;
        this.maximumBackups = maximumBackups;
        this.schedule = schedule;
        this.cancelSchedule = cancelSchedule;
        this.log = log;
        this.timer = null;
        this.pendingBackup = null;
    }

    start() {
        if (this.timer) {
            return;
        }

        void this.runScheduledBackup();

        this.timer = this.schedule(
            () => {
                void this.runScheduledBackup();
            },
            this.intervalMs
        );

        this.timer.unref?.();
    }

    stop() {
        if (!this.timer) {
            return;
        }

        this.cancelSchedule(this.timer);
        this.timer = null;
    }

    async runScheduledBackup() {
        try {
            const backupPath =
                await this.createBackup();

            this.log.info(
                `Sauvegarde créée : ${backupPath}`
            );
        } catch (error) {
            this.log.error(
                "Échec de la sauvegarde automatique :",
                error
            );
        }
    }

    createBackup(now = new Date()) {
        if (this.pendingBackup) {
            return this.pendingBackup;
        }

        this.pendingBackup =
            this.performBackup(now)
                .finally(
                    () => {
                        this.pendingBackup = null;
                    }
                );

        return this.pendingBackup;
    }

    async performBackup(now) {
        this.fileSystem.mkdirSync(
            this.backupDirectory,
            {
                recursive: true
            }
        );

        const backupPath = path.join(
            this.backupDirectory,
            `greycore-${formatTimestamp(now)}.sqlite`
        );

        await this.database.backup(backupPath);

        this.pruneBackups();

        return backupPath;
    }

    pruneBackups() {
        const backupFiles =
            this.fileSystem.readdirSync(
                this.backupDirectory
            )
                .filter(
                    file =>
                        BACKUP_FILE_PATTERN.test(file)
                )
                .sort()
                .reverse();

        for (
            const file of backupFiles.slice(
                this.maximumBackups
            )
        ) {
            this.fileSystem.unlinkSync(
                path.join(
                    this.backupDirectory,
                    file
                )
            );
        }
    }

}

function readPositiveInteger(
    value,
    fallback,
    maximum
) {
    const number = Number(value);

    if (
        !Number.isInteger(number)
        || number < 1
        || number > maximum
    ) {
        return fallback;
    }

    return number;
}

function formatTimestamp(date) {
    const datePart = [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
    ].map(
        value =>
            String(value).padStart(2, "0")
    );

    const timePart = [
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
    ].map(
        (
            value,
            index
        ) => String(value).padStart(
            index === 3
                ? 3
                : 2,
            "0"
        )
    );

    return `${datePart.join("-")}_${timePart.join("-")}`;
}

const service = new DatabaseBackupService();

module.exports = service;
module.exports.DatabaseBackupService =
    DatabaseBackupService;
module.exports.formatTimestamp = formatTimestamp;
