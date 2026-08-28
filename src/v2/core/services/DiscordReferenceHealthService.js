const repository = require(
    "../../repositories/DiscordReferenceHealthRepository"
);

const CHECK_DELAY_MS = Object.freeze({
    unknown_channel: 6 * 60 * 60 * 1000,
    missing_access: 30 * 60 * 1000,
    missing_permissions: 30 * 60 * 1000,
    discord_error: 5 * 60 * 1000
});

const FAILURE_STATUSES = new Set(
    Object.keys(CHECK_DELAY_MS)
);

const MAX_DIAGNOSTIC_LENGTH = 500;

class DiscordReferenceHealthService {
    recordFailure(reference, diagnostic, now = new Date()) {
        const normalized = this.normalizeReference(reference);
        const checkedAt = this.normalizeDate(now);
        const status = this.failureStatus(diagnostic);
        const nextCheckAt = new Date(
            new Date(checkedAt).getTime()
            + CHECK_DELAY_MS[status]
        ).toISOString();

        return repository.recordFailure({
            ...normalized,
            status,
            discordCode: this.discordCode(diagnostic),
            checkedAt,
            nextCheckAt,
            diagnostic: this.cleanDiagnostic(diagnostic)
        });
    }

    get(reference) {
        return repository.get(
            this.normalizeReference(reference)
        );
    }

    shouldCheck(reference, now = new Date()) {
        const current = this.get(reference);

        if (
            !current
            || current.status === "resolved"
            || !current.next_check_at
        ) {
            return true;
        }

        return new Date(this.normalizeDate(now)).getTime()
            >= new Date(current.next_check_at).getTime();
    }

    markResolved(reference, now = new Date()) {
        return repository.markResolved({
            ...this.normalizeReference(reference),
            checkedAt: this.normalizeDate(now)
        });
    }

    normalizeReference(reference) {
        const normalized = {
            domain: this.requiredText(reference?.domain, "domain"),
            ownerKey: this.requiredText(
                reference?.ownerKey || reference?.owner_key,
                "ownerKey"
            ),
            resourceKind: this.requiredText(
                reference?.resourceKind || reference?.resource_kind,
                "resourceKind"
            ),
            discordId: this.requiredText(
                reference?.discordId || reference?.discord_id,
                "discordId"
            ),
            guildId: reference?.guildId || reference?.guild_id || null
        };

        if (normalized.guildId !== null) {
            normalized.guildId = String(normalized.guildId);
        }

        return normalized;
    }

    requiredText(value, name) {
        const text = String(value || "").trim();
        if (!text) {
            throw new Error(
                `Référence Discord invalide : ${name} requis.`
            );
        }
        return text;
    }

    failureStatus(diagnostic) {
        const candidates = [
            diagnostic?.status,
            diagnostic?.kind,
            diagnostic?.error?.kind
        ];

        return candidates.find(candidate =>
            FAILURE_STATUSES.has(candidate)
        ) || "discord_error";
    }

    discordCode(diagnostic) {
        const value = diagnostic?.discordCode
            ?? diagnostic?.discord_code
            ?? diagnostic?.error?.discordCode
            ?? null;
        if (value === null || value === "") {
            return null;
        }
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
    }

    cleanDiagnostic(diagnostic) {
        const value = diagnostic?.error?.message
            || diagnostic?.message
            || diagnostic?.diagnostic
            || (diagnostic instanceof Error
                ? diagnostic.message
                : "Diagnostic Discord indisponible");

        return String(value)
            .replace(
                /Authorization\s*:\s*[^\r\n]+/gi,
                "Authorization: [REDACTED]"
            )
            .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
            .replace(
                /\/api(?:\/v\d+)?\/webhooks\/\d+\/[^\s/?]+/gi,
                "/api/webhooks/[REDACTED]"
            )
            .replace(
                /(["']?(?:token|secret)["']?\s*[:=]\s*)["']?[^\s,"'}]+/gi,
                "$1[REDACTED]"
            )
            .slice(0, MAX_DIAGNOSTIC_LENGTH);
    }

    normalizeDate(value) {
        const date = value instanceof Date
            ? value
            : new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new Error("Date de contrôle Discord invalide.");
        }
        return date.toISOString();
    }

    get checkDelays() {
        return CHECK_DELAY_MS;
    }
}

module.exports = new DiscordReferenceHealthService();
