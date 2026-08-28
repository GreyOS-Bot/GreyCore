const channelDiagnosticService = require("./DiscordChannelDiagnosticService");
const referenceHealthService = require("./DiscordReferenceHealthService");

class DiscordReferenceResolverService {
    async resolve(reference, context = {}, options = {}) {
        const now = options.now || new Date();
        if (!options.force && !referenceHealthService.shouldCheck(reference, now)) {
            return { checked: false, available: false, channel: null, diagnostic: null };
        }

        const diagnostic = options.channel
            ? {
                ...await channelDiagnosticService.inspectChannel(
                    options.channel,
                    { ...context, source: "cache" }
                ),
                channel: options.channel
            }
            : await channelDiagnosticService.resolveChannel(
                reference.discordId || reference.discord_id,
                context
            );
        if (!diagnostic.found) {
            referenceHealthService.recordFailure(reference, diagnostic, now);
            return { checked: true, available: false, channel: null, diagnostic };
        }

        referenceHealthService.markResolved(reference, now);
        return { checked: true, available: true, channel: diagnostic.channel, diagnostic };
    }

    errorFor(result, feature = "discord_reference") {
        const status = result?.diagnostic?.status || "check_deferred";
        const error = new Error(status === "check_deferred"
            ? "Référence Discord temporairement différée après un incident connu."
            : `Référence Discord indisponible (${status}).`);
        error.name = "DiscordReferenceUnavailableError";
        error.code = "DISCORD_REFERENCE_UNAVAILABLE";
        error.discordReference = {
            feature,
            status,
            discordCode: result?.diagnostic?.error?.discordCode ?? null
        };
        return error;
    }

    recordFailure(reference, diagnostic, now = new Date()) {
        return referenceHealthService.recordFailure(
            reference,
            diagnostic,
            now
        );
    }
}

module.exports = new DiscordReferenceResolverService();
