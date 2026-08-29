const channelDiagnosticService = require(
    "./DiscordChannelDiagnosticService"
);

class DiscordThreadAccessService {
    async ensureWritable(channel, context = {}) {
        const diagnostic =
            await channelDiagnosticService.inspectChannel(
                channel,
                context
            );

        if (!diagnostic.found) {
            return this.result(
                diagnostic.status,
                diagnostic
            );
        }

        if (diagnostic.status === "unsupported_type") {
            if (channel.type == null) {
                return this.result(
                    "ready",
                    diagnostic,
                    channel
                );
            }

            return this.result(
                "unsupported",
                diagnostic
            );
        }

        if (!diagnostic.isThread) {
            return this.result(
                "ready",
                diagnostic,
                channel
            );
        }

        if (diagnostic.locked) {
            return this.result(
                "locked",
                diagnostic,
                channel
            );
        }

        if (!diagnostic.archived) {
            return this.result(
                "ready",
                diagnostic,
                channel
            );
        }

        if (typeof channel.setArchived !== "function") {
            return this.result(
                "discord_error",
                diagnostic,
                channel,
                {
                    kind: "discord_error",
                    discordCode: null,
                    retryable: false,
                    message:
                        "Ce thread ne peut pas être rouvert avec l’objet Discord disponible."
                }
            );
        }

        try {
            const reopenedChannel =
                await channel.setArchived(
                    false,
                    "Réouverture automatique GreyCore avant écriture"
                );
            const currentChannel =
                reopenedChannel || channel;
            const refreshed =
                await channelDiagnosticService.inspectChannel(
                    currentChannel,
                    {
                        ...context,
                        source: "reopened"
                    }
                );

            if (refreshed.locked) {
                return this.result(
                    "locked",
                    refreshed,
                    currentChannel
                );
            }

            if (refreshed.archived) {
                return this.result(
                    "discord_error",
                    refreshed,
                    currentChannel,
                    {
                        kind: "discord_error",
                        discordCode: null,
                        retryable: false,
                        message:
                            "Discord indique toujours que le thread est archivé."
                    }
                );
            }

            return this.result(
                "reopened",
                refreshed,
                currentChannel
            );
        } catch (error) {
            const classified =
                channelDiagnosticService
                    .classifyDiscordChannelError(error);

            return this.result(
                classified.kind,
                diagnostic,
                channel,
                classified
            );
        }
    }

    errorFor(result, feature = "discord_thread") {
        const error = new Error(
            this.userMessage(result)
        );

        error.name = "DiscordThreadAccessError";
        error.code = "DISCORD_THREAD_NOT_WRITABLE";
        error.threadAccess = {
            feature,
            status: result?.status || "discord_error",
            channelId:
                result?.diagnostic?.channelId || null,
            parentId:
                result?.diagnostic?.parentId || null,
            archived:
                result?.diagnostic?.archived ?? null,
            locked:
                result?.diagnostic?.locked ?? null,
            diagnosticKind:
                result?.error?.kind
                || result?.status
                || "discord_error",
            discordCode:
                result?.error?.discordCode ?? null
        };

        return error;
    }

    userMessage(result) {
        switch (result?.status) {
        case "locked":
            return "Ce thread est verrouillé. Un membre du staff doit le rouvrir avant de pouvoir continuer ici.";
        case "missing_permissions":
            return "GreyCore n’a pas les permissions nécessaires pour utiliser ce thread.";
        case "missing_access":
            return "GreyCore n’a plus accès à ce thread.";
        case "unknown_channel":
            return "Ce thread est introuvable sur Discord.";
        case "unsupported":
            return "Ce type de salon ne permet pas cette opération.";
        default:
            return "Ce thread est archivé et GreyCore n’a pas pu le rouvrir.";
        }
    }

    result(
        status,
        diagnostic,
        channel = null,
        error = null
    ) {
        return {
            ready:
                status === "ready"
                || status === "reopened",
            reopened:
                status === "reopened",
            status,
            channel,
            diagnostic,
            error
        };
    }
}

module.exports = new DiscordThreadAccessService();
