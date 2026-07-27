const test =
    require("node:test");
const assert =
    require("node:assert/strict");
const fs =
    require("node:fs");
const path =
    require("node:path");

test(
    "la base cree son dossier parent avant son ouverture",
    () => {
        const databaseModulePath =
            require.resolve(
                "../src/database/database"
            );
        const sqliteModulePath =
            require.resolve("better-sqlite3");
        const originalDatabaseModule =
            require.cache[databaseModulePath];
        const originalSqliteModule =
            require.cache[sqliteModulePath];
        const originalMkdirSync =
            fs.mkdirSync;
        const calls = [];
        const databasePath =
            path.resolve(
                __dirname,
                "../data/greycore.sqlite"
            );

        class FakeDatabase {
            constructor(openedPath) {
                calls.push({
                    type: "open",
                    path: openedPath
                });
            }
        }

        fs.mkdirSync = (
            directoryPath,
            options
        ) => {
            calls.push({
                type: "mkdir",
                path: directoryPath,
                options
            });
        };

        delete require.cache[databaseModulePath];
        require.cache[sqliteModulePath] = {
            id: sqliteModulePath,
            filename: sqliteModulePath,
            loaded: true,
            exports: FakeDatabase
        };

        try {
            require("../src/database/database");

            assert.deepEqual(
                calls,
                [
                    {
                        type: "mkdir",
                        path: path.dirname(databasePath),
                        options: {
                            recursive: true
                        }
                    },
                    {
                        type: "open",
                        path: databasePath
                    }
                ]
            );
        } finally {
            fs.mkdirSync = originalMkdirSync;

            if (originalDatabaseModule) {
                require.cache[databaseModulePath] =
                    originalDatabaseModule;
            } else {
                delete require.cache[databaseModulePath];
            }

            if (originalSqliteModule) {
                require.cache[sqliteModulePath] =
                    originalSqliteModule;
            } else {
                delete require.cache[sqliteModulePath];
            }
        }
    }
);
