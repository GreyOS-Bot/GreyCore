const fs =
    require("node:fs");
const os =
    require("node:os");
const path =
    require("node:path");

const Database =
    require("better-sqlite3");

function createIsolatedDatabase({
    copyExisting = false
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
