const fs =
    require("node:fs");
const path =
    require("node:path");
const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const V2_ROOT =
    path.resolve(
        "src/v2"
    );

const ALLOWED_SHARED_BOUNDARIES =
    new Set([
        path.resolve(
            "src/database/database.js"
        ),
        path.resolve(
            "src/webhooks/webhookManager.js"
        ),
        path.resolve(
            "src/managers/ProxyMessageManager.js"
        )
    ]);

test(
    "la V2 ne dépend plus directement des anciens parcours",
    () => {
        const unexpected = [];

        for (
            const file
            of listJavaScriptFiles(
                V2_ROOT
            )
        ) {
            const source =
                fs.readFileSync(
                    file,
                    "utf8"
                );

            for (
                const dependency
                of getRelativeDependencies(
                    source
                )
            ) {
                const resolved =
                    require.resolve(
                        path.resolve(
                            path.dirname(
                                file
                            ),
                            dependency
                        )
                    );

                if (
                    isInsideV2(
                        resolved
                    )
                    || ALLOWED_SHARED_BOUNDARIES
                        .has(
                            resolved
                        )
                ) {
                    continue;
                }

                unexpected.push({
                    file:
                        path.relative(
                            process.cwd(),
                            file
                        ),
                    dependency:
                        path.relative(
                            process.cwd(),
                            resolved
                        )
                });
            }
        }

        assert.deepEqual(
            unexpected,
            []
        );
    }
);

function getRelativeDependencies(
    source
) {
    const dependencies = [];

    const requirePattern =
        /require\s*\(\s*["']([^"']+)["']\s*\)/g;

    let match =
        requirePattern.exec(
            source
        );

    while (match) {
        if (
            match[1]
                .startsWith(".")
        ) {
            dependencies.push(
                match[1]
            );
        }

        match =
            requirePattern.exec(
                source
            );
    }

    return dependencies;
}

function isInsideV2(
    file
) {
    return (
        file === V2_ROOT
        || file.startsWith(
            V2_ROOT
            + path.sep
        )
    );
}

function listJavaScriptFiles(
    directory
) {
    return fs.readdirSync(
        directory,
        {
            withFileTypes:
                true
        }
    ).flatMap(
        entry => {
            const entryPath =
                path.join(
                    directory,
                    entry.name
                );

            if (entry.isDirectory()) {
                return listJavaScriptFiles(
                    entryPath
                );
            }

            return entry.isFile()
                && entry.name
                    .endsWith(
                        ".js"
                    )
                ? [
                    entryPath
                ]
                : [];
        }
    );
}
