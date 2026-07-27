const LEVEL_METHODS = {
    error:
        "error",
    warn:
        "warn",
    info:
        "log"
};

function create(
    scope
) {
    const normalizedScope =
        String(
            scope
            || "GreycoreV2"
        ).trim()
        || "GreycoreV2";

    return {
        error:
            (...values) =>
                write(
                    "error",
                    normalizedScope,
                    values
                ),
        warn:
            (...values) =>
                write(
                    "warn",
                    normalizedScope,
                    values
                ),
        info:
            (...values) =>
                write(
                    "info",
                    normalizedScope,
                    values
                )
    };
}

function write(
    level,
    scope,
    values
) {
    const method =
        LEVEL_METHODS[level]
        || LEVEL_METHODS.info;

    console[method](
        `[${new Date().toISOString()}]`,
        `[${level.toUpperCase()}]`,
        `[${scope}]`,
        ...values
    );
}

module.exports = {
    create
};
