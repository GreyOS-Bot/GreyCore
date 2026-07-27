const test =
    require("node:test");
const assert =
    require("node:assert/strict");
const fs =
    require("node:fs");
const path =
    require("node:path");

const projectRoot =
    path.resolve(__dirname, "..");

const responseServicePath =
    path.resolve(
        projectRoot,
        "src/v2/core/services/InteractionResponseService.js"
    );

test(
    "les réponses privées V2 passent toutes par le service central",
    () => {
        const sourceFiles = [
            ...listJavaScriptFiles(
                path.resolve(
                    projectRoot,
                    "src/v2"
                )
            ),
            ...listJavaScriptFiles(
                path.resolve(
                    projectRoot,
                    "src/services"
                )
            )
        ];

        const offenders =
            sourceFiles
                .filter(
                    filePath =>
                        filePath !==
                        responseServicePath
                )
                .filter(
                    filePath => {
                        const source =
                            fs.readFileSync(
                                filePath,
                                "utf8"
                            );

                        return (
                            /\bephemeral\s*:/
                                .test(
                                    source
                                )
                            ||
                            /\bflags\s*:\s*(?:64|MessageFlags\s*\.\s*Ephemeral)/
                                .test(
                                    source
                                )
                            ||
                            /MessageFlags\s*\.\s*Ephemeral/
                                .test(
                                    source
                                )
                        );
                    }
                )
                .map(
                    filePath =>
                        path.relative(
                            projectRoot,
                            filePath
                        )
                );

        assert.deepEqual(
            offenders,
            []
        );
    }
);

function listJavaScriptFiles(
    directoryPath
) {
    if (
        !fs.existsSync(
            directoryPath
        )
    ) {
        return [];
    }

    return fs
        .readdirSync(
            directoryPath,
            {
                withFileTypes:
                    true
            }
        )
        .flatMap(
            entry => {
                const entryPath =
                    path.join(
                        directoryPath,
                        entry.name
                    );

                if (
                    entry.isDirectory()
                ) {
                    return listJavaScriptFiles(
                        entryPath
                    );
                }

                return (
                    entry.isFile()
                    &&
                    entry.name
                        .endsWith(
                            ".js"
                        )
                )
                    ? [
                        entryPath
                    ]
                    : [];
            }
        );
}
