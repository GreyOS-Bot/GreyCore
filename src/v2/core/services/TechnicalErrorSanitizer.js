const SECRET_ENV_KEYS = [
    "GREYFATE_SHARED_SECRET",
    "DISCORD_TOKEN",
    "BOT_TOKEN",
    "TOKEN"
];

function sanitizeText(value, { maximum = 4_000 } = {}) {
    if (value === null || value === undefined) return "";

    let text = value instanceof Error
        ? value.message
        : String(value);

    text = text
        .replace(
            /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/(\d+)\/[^\s"'<>]+/gi,
            "https://discord.com/api/webhooks/$1/[REDACTED]"
        )
        .replace(
            /Authorization\s*:\s*(?:Bearer\s+)?[^\s,;]+/gi,
            "Authorization: [REDACTED]"
        )
        .replace(
            /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
            "Bearer [REDACTED]"
        );

    for (const key of SECRET_ENV_KEYS) {
        const secret = process.env[key];
        if (secret && secret.length >= 4) {
            text = text.split(secret).join("[REDACTED]");
        }
    }

    text = text
        .replace(
            /[A-Za-z]:[\\/](?:[^\\/\r\n]+[\\/])*GreyCore[\\/]/gi,
            "<project>/"
        )
        .replace(
            /\/(?:home|var|opt|srv|usr|Users)\/(?:[^/\r\n]+\/)*GreyCore\//gi,
            "<project>/"
        )
        .replace(
            /\b[A-Za-z]:[\\/][^\s:)\]}]+/g,
            "<path>"
        )
        .replace(
            /\/(?:home|var|opt|srv)\/[A-Za-z0-9._~/-]+/g,
            "<path>"
        )
        .replace(/\\/g, "/")
        .replace(/`/g, "'")
        .trim();

    return text.length > maximum
        ? `${text.slice(0, maximum - 1)}…`
        : text;
}

function sanitizeError(
    error,
    {
        messageMaximum = 1_000,
        stackMaximum = 3_500
    } = {}
) {
    const source = error instanceof Error
        ? error
        : new Error(String(error ?? "Erreur inconnue."));

    return {
        name: sanitizeText(source.name || "Erreur", { maximum: 100 }),
        code: source.code === undefined
            ? null
            : sanitizeText(source.code, { maximum: 100 }),
        message: sanitizeText(
            source.message || "Erreur inconnue.",
            { maximum: messageMaximum }
        ),
        stack: source.stack
            ? sanitizeText(source.stack, { maximum: stackMaximum })
            : null
    };
}

module.exports = {
    sanitizeText,
    sanitizeError
};
