const test =
    require("node:test");
const assert =
    require("node:assert/strict");
const fs =
    require("node:fs");
const path =
    require("node:path");

const projectRoot =
    path.resolve(
        __dirname,
        ".."
    );

test(
    "les sources et la documentation ne contiennent aucun texte mal encodé",
    () => {
        const files = [
            ...listFiles(
                path.resolve(
                    projectRoot,
                    "src"
                ),
                new Set([
                    ".js",
                    ".json",
                    ".sql"
                ])
            ),
            ...listFiles(
                path.resolve(
                    projectRoot,
                    "docs"
                ),
                new Set([
                    ".md"
                ])
            )
        ];

        const suspiciousPatterns = [
            /Ã[\u0080-\u00bf]/u,
            /Â(?:[\u0080-\u00bf]|\s)/u,
            /â(?:[\u0080-\u00bf]|€)/u,
            /ðŸ/u,
            /ï»¿/u,
            /\uFFFD/u
        ];

        const offenders =
            files
                .filter(
                    filePath => {
                        const source =
                            fs.readFileSync(
                                filePath,
                                "utf8"
                            );

                        return suspiciousPatterns
                            .some(
                                pattern =>
                                    pattern
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

test(
    "les journaux techniques V2 passent par le service central",
    () => {
        const v2Root =
            path.resolve(
                projectRoot,
                "src/v2"
            );

        const offenders =
            listFiles(
                v2Root,
                new Set([
                    ".js"
                ])
            )
                .filter(
                    filePath =>
                        !filePath.includes(
                            `${path.sep}migrations${path.sep}`
                        )
                )
                .filter(
                    filePath =>
                        /console\s*\.\s*(?:log|warn|error)\s*\(/
                            .test(
                                fs.readFileSync(
                                    filePath,
                                    "utf8"
                                )
                            )
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

test(
    "le journal central ajoute le niveau, le périmètre et l’horodatage",
    () => {
        const technicalLogger =
            require(
                "../src/v2/core/services/TechnicalLogger"
            );

        const originalError =
            console.error;
        let captured = null;

        console.error =
            (...values) => {
                captured =
                    values;
            };

        try {
            technicalLogger
                .create(
                    "QualityTest"
                )
                .error(
                    "Échec contrôlé"
                );
        } finally {
            console.error =
                originalError;
        }

        assert.match(
            captured[0],
            /^\[\d{4}-\d{2}-\d{2}T/
        );

        assert.deepEqual(
            captured.slice(
                1
            ),
            [
                "[ERROR]",
                "[QualityTest]",
                "Échec contrôlé"
            ]
        );
    }
);

function listFiles(
    directoryPath,
    extensions
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
                    return listFiles(
                        entryPath,
                        extensions
                    );
                }

                return (
                    entry.isFile()
                    &&
                    extensions.has(
                        path.extname(
                            entry.name
                        )
                    )
                )
                    ? [
                        entryPath
                    ]
                    : [];
            }
        );
}
