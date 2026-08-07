const fs =
    require("node:fs");
const os =
    require("node:os");
const path =
    require("node:path");

const Database =
    require("better-sqlite3");

function createIsolatedDatabase({
    copyExisting = false,
    initializeSchema = false
} = {}) {
    const databasePath =
        path.join(
            os.tmpdir(),
            `greycore-test-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`
        );

    if (copyExisting) {
        fs.copyFileSync(
            path.resolve(
                "data/greycore.sqlite"
            ),
            databasePath
        );
    }

    const database =
        new Database(
            databasePath
        );

    const databaseModule =
        require.resolve(
            path.resolve(
                "src/database/database.js"
            )
        );

    require.cache[databaseModule] = {
        id:
            databaseModule,
        filename:
            databaseModule,
        loaded:
            true,
        exports:
            database
    };

    clearApplicationSchemaCache();

    if (initializeSchema) {
        initializeApplicationSchema();
    }

    return {
        database,
        cleanup() {
            if (database.open) {
                database.close();
            }

            for (
                const suffix
                of ["", "-wal", "-shm"]
            ) {
                const file =
                    databasePath
                    + suffix;

                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            }
        }
    };
}

function initializeApplicationSchema() {
    const schema =
        require(
            path.resolve(
                "src/database/schema.js"
            )
        );

    withMutedConsoleSync(
        () => schema.initializeDatabase()
    );
}

function clearApplicationSchemaCache() {
    const schemaModules = [
        "src/database/schema.js",
        "src/database/schemaV2.js",
        "src/database/schemaV2Profile.js",
        "src/database/schemaV2Roleplay.js",
        "src/database/schemaV2Media.js",
        "src/database/schemaV2Installation.js",
        "src/database/schemaV2Assets.js",
        "src/database/schemaV2Automation.js",
        "src/database/schemaV2SceneAssistant.js",
        "src/database/schemaV2StaffPermissions.js"
    ];

    for (const modulePath of schemaModules) {
        delete require.cache[
            require.resolve(
                path.resolve(modulePath)
            )
        ];
    }
}

function withMutedConsoleSync(
    callback
) {
    const methods = [
        "log",
        "warn",
        "error"
    ];

    const originals =
        new Map(
            methods.map(
                method => [
                    method,
                    console[method]
                ]
            )
        );

    for (const method of methods) {
        console[method] = () => {};
    }

    try {
        return callback();
    } finally {
        for (const method of methods) {
            console[method] =
                originals.get(method);
        }
    }
}

async function withMutedConsole(
    callback
) {
    const methods = [
        "log",
        "warn",
        "error"
    ];

    const originals =
        new Map(
            methods.map(
                method => [
                    method,
                    console[method]
                ]
            )
        );

    for (const method of methods) {
        console[method] = () => {};
    }

    try {
        return await callback();
    } finally {
        for (const method of methods) {
            console[method] =
                originals.get(method);
        }
    }
}

module.exports = {
    createIsolatedDatabase,
    withMutedConsole
};
