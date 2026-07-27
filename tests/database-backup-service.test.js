const test =
    require("node:test");
const assert =
    require("node:assert/strict");
const path = require("node:path");

const {
    stubModule
} = require("./helpers/moduleStub");

stubModule(
    "src/database/database.js",
    {}
);

const {
    DatabaseBackupService,
    formatTimestamp
} = require(
    "../src/database/DatabaseBackupService"
);

test(
    "les sauvegardes SQLite sont créées puis les plus anciennes sont conservées dans la limite prévue",
    async () => {
        const calls = [];
        const backupDirectory =
            path.join(
                "C:",
                "Greycore",
                "data",
                "backups"
            );

        const fileSystem = {
            mkdirSync: (
                directory,
                options
            ) => calls.push([
                "mkdir",
                directory,
                options
            ]),
            readdirSync: () => [
                "greycore-2026-07-27_12-00-00-000.sqlite",
                "greycore-2026-07-27_13-00-00-000.sqlite",
                "greycore-2026-07-27_14-00-00-000.sqlite",
                "copie-manuelle.sqlite"
            ],
            unlinkSync: file =>
                calls.push([
                    "unlink",
                    file
                ])
        };

        const service =
            new DatabaseBackupService({
                databaseConnection: {
                    backup: async target => {
                        calls.push([
                            "backup",
                            target
                        ]);
                    }
                },
                fileSystem,
                backupDirectory,
                maximumBackups: 2,
                log: {
                    info: () => {},
                    error: () => {}
                }
            });

        const date = new Date(
            2026,
            6,
            27,
            15,
            30,
            12,
            45
        );

        const backupPath =
            await service.createBackup(date);

        assert.equal(
            backupPath,
            path.join(
                backupDirectory,
                `greycore-${formatTimestamp(date)}.sqlite`
            )
        );
        assert.equal(
            calls.some(
                call =>
                    call[0] === "backup"
                    && call[1] === backupPath
            ),
            true
        );
        assert.deepEqual(
            calls.filter(
                call =>
                    call[0] === "unlink"
            ),
            [
                [
                    "unlink",
                    path.join(
                        backupDirectory,
                        "greycore-2026-07-27_12-00-00-000.sqlite"
                    )
                ]
            ]
        );
    }
);

test(
    "le planificateur de sauvegarde ne crée qu’une seule minuterie",
    () => {
        const calls = [];
        const timer = {
            unref: () =>
                calls.push("unref")
        };

        const service =
            new DatabaseBackupService({
                databaseConnection: {
                    backup: async () => {}
                },
                fileSystem: {
                    mkdirSync: () => {},
                    readdirSync: () => [],
                    unlinkSync: () => {}
                },
                schedule: (
                    callback,
                    intervalMs
                ) => {
                    calls.push([
                        "schedule",
                        intervalMs
                    ]);

                    return timer;
                },
                cancelSchedule: value =>
                    calls.push([
                        "cancel",
                        value
                    ]),
                log: {
                    info: () => {},
                    error: () => {}
                }
            });

        service.runScheduledBackup =
            async () => {
                calls.push("backup");
            };

        service.start();
        service.start();
        service.stop();

        assert.deepEqual(
            calls,
            [
                "backup",
                [
                    "schedule",
                    6 * 60 * 60 * 1000
                ],
                "unref",
                [
                    "cancel",
                    timer
                ]
            ]
        );
    }
);
