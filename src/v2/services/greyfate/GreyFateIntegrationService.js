const http = require("node:http");
const crypto = require("node:crypto");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const repository = require("../../repositories/GreyFateRepository");
const entityManager = require("../../managers/NarrativeEntityV2Manager");
const webhookManager = require("../../../webhooks/webhookManager");
const threadAccessService = require("../../core/services/DiscordThreadAccessService");
const referenceResolver = require("../../core/services/DiscordReferenceResolverService");
const logger = require("../../core/services/TechnicalLogger").create("GreyFateIntegrationService");

const SUPPORTED_EVENTS = new Set([
    "GREYFATE_EVENT_STARTED",
    "GREYFATE_DUO_CLOSURE_DUE",
    "GREYFATE_EVENT_COMPLETED",
    "GREYFATE_EVENT_CONTINUED"
]);

class GreyFateIntegrationService {
    constructor() {
        this.client = null;
        this.server = null;
        this.available = false;
        this.starting = false;
        this.stopRequested = false;
    }
    enabled() { return String(process.env.GREYFATE_INTEGRATION_ENABLED || "false").toLowerCase() === "true"; }
    initializeSchema() { repository.initializeSchema(); }
    start(client) {
        this.client = client;
        if (!this.enabled()) { logger.info("GreyFate integration disabled by feature flag."); return; }

        if (this.server) {
            return this.server;
        }

        try {
            this.initializeSchema();
            if (!process.env.GREYFATE_SHARED_SECRET) throw new Error("GREYFATE_SHARED_SECRET absent");
            const host = process.env.GREYCORE_FATE_HOST || "127.0.0.1", port = Number(process.env.GREYCORE_FATE_PORT || 8790);
            if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("GREYCORE_FATE_PORT invalide");
            this.starting = true;
            this.stopRequested = false;

            const server = http.createServer(
                (req, res) => {
                    Promise.resolve()
                        .then(
                            () => this.handleHttp(
                                req,
                                res
                            )
                        )
                        .catch(
                            error =>
                                this.handleUnexpectedHttpError(
                                    error,
                                    res
                                )
                        );
                }
            );

            this.server = server;

            server.on(
                "error",
                error => {
                    this.available = false;
                    this.starting = false;

                    logger.error(
                        "GreyFate receiver isolated error:",
                        String(
                            error?.code
                            || error?.message
                            || "Erreur inconnue"
                        )
                    );

                    if (this.server === server) {
                        this.server = null;
                    }
                }
            );

            server.listen(
                port,
                host,
                () => {
                    this.starting = false;

                    if (
                        this.stopRequested
                        || this.server !== server
                    ) {
                        this.closeServer(
                            server
                        );
                        return;
                    }

                    this.available = true;
                    logger.info(
                        `GreyFate receiver active on ${host}:${port}`
                    );
                }
            );

            return server;
        } catch (error) {
            this.available = false;
            this.starting = false;
            this.server = null;
            logger.error(
                "GreyFate integration isolated; GreyCore remains available:",
                String(
                    error?.message
                    || "Erreur inconnue"
                )
            );
            return null;
        }
    }
    handleUnexpectedHttpError(error, res) {
        logger.error(
            "GreyFate HTTP handler failed:",
            String(
                error?.message
                || "Erreur inconnue"
            )
        );

        if (
            res.headersSent
            || res.writableEnded
        ) {
            return;
        }

        this.respond(
            res,
            500,
            {
                ok: false,
                error: "INTERNAL_ERROR"
            }
        );
    }
    closeServer(server) {
        if (!server) {
            return Promise.resolve(false);
        }

        return new Promise(
            resolve => {
                const done = () => {
                    if (this.server === server) {
                        this.server = null;
                    }
                    this.available = false;
                    this.starting = false;
                    resolve(true);
                };

                try {
                    server.close(done);
                } catch (error) {
                    if (
                        error?.code !==
                        "ERR_SERVER_NOT_RUNNING"
                    ) {
                        logger.error(
                            "GreyFate receiver close failed:",
                            String(
                                error?.code
                                || error?.message
                                || "Erreur inconnue"
                            )
                        );
                    }
                    done();
                }
            }
        );
    }
    stop() {
        this.stopRequested = true;
        this.available = false;

        const server =
            this.server;

        if (!server) {
            this.starting = false;
            return Promise.resolve(false);
        }

        if (!server.listening) {
            return Promise.resolve(false);
        }

        return this.closeServer(
            server
        );
    }
    authenticate(req) { const a = Buffer.from(String(req.headers.authorization || "")), b = Buffer.from(`Bearer ${process.env.GREYFATE_SHARED_SECRET || ""}`); return a.length === b.length && crypto.timingSafeEqual(a, b); }
    read(req) { return new Promise((resolve, reject) => { let body = ""; req.on("data", c => { body += c; if (body.length > 262144) { reject(new Error("Payload trop volumineux")); req.destroy(); } }); req.on("end", () => { try { resolve(JSON.parse(body || "{}")); } catch { reject(new Error("JSON invalide")); } }); req.on("error", reject); }); }
    respond(res, status, body) { res.writeHead(status, { "content-type": "application/json; charset=utf-8" }); res.end(JSON.stringify(body)); }
    async handleHttp(req, res) {
        if (req.method !== "POST" || req.url !== "/integrations/greyfate/events") {
            return this.respond(res, 404, { error: "NOT_FOUND" });
        }
        if (!this.authenticate(req)) return this.respond(res, 401, { error: "UNAUTHORIZED" });

        let payload;
        try {
            payload = await this.read(req);
            this.validateInboundPayload(payload);
        } catch (error) {
            logger.warn("GreyFate invalid event rejected:", error.message);
            return this.respond(res, 400, { ok: false, error: "INVALID_PAYLOAD" });
        }

        let claim;
        try {
            claim = repository.claimOperation(payload.operationKey, payload.type);
        } catch (error) {
            logger.error("GreyFate operation claim failed:", error);
            return this.respond(res, 503, { ok: false, error: "TEMPORARY_FAILURE" });
        }
        if (claim.state === "completed") return this.respond(res, 200, { ok: true, duplicate: true });
        if (claim.state === "processing") return this.respond(res, 409, { ok: false, error: "OPERATION_IN_PROGRESS" });
        if (claim.state === "failed_uncertain") return this.respond(res, 409, { ok: false, error: "OPERATION_REQUIRES_REVIEW" });
        if (claim.state === "key_conflict") return this.respond(res, 409, { ok: false, error: "OPERATION_KEY_CONFLICT" });
        if (claim.state !== "claimed" || !claim.claimToken) {
            logger.error("GreyFate operation claim returned an unknown state:", claim.state);
            return this.respond(res, 503, { ok: false, error: "TEMPORARY_FAILURE" });
        }

        const executionState = { externalEffectAttempted: false };
        try {
            await this.process(payload, executionState);
            const completed = repository.completeOperation(payload.operationKey, payload.type, claim.claimToken);
            if (!completed) throw new Error("La réservation GreyFate n’est plus valide");
            return this.respond(res, 200, { ok: true });
        } catch (error) {
            logger.error("GreyFate event failed without impacting GreyCore availability:", error);
            if (executionState.externalEffectAttempted) {
                repository.markClaimUncertain(payload.operationKey, claim.claimToken, error);
                return this.respond(res, 500, { ok: false, error: "OPERATION_STATE_UNCERTAIN" });
            }
            repository.releaseClaim(payload.operationKey, claim.claimToken);
            return this.respond(res, 503, { ok: false, error: "TEMPORARY_FAILURE" });
        }
    }
    validateInboundPayload(payload) {
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Payload invalide");
        if (typeof payload.operationKey !== "string" || !payload.operationKey.trim()) throw new Error("operationKey requis");
        if (typeof payload.type !== "string" || !SUPPORTED_EVENTS.has(payload.type)) throw new Error("Type d’événement invalide");
    }
    async process(payload, executionState = { externalEffectAttempted: false }) { if (payload.type === "GREYFATE_EVENT_STARTED") return this.eventStarted(payload, executionState); if (payload.type === "GREYFATE_DUO_CLOSURE_DUE") return this.closureDue(payload, executionState); if (payload.type === "GREYFATE_EVENT_COMPLETED" || payload.type === "GREYFATE_EVENT_CONTINUED") return; throw new Error(`Événement inconnu : ${payload.type}`); }
    entity(guildId) { return entityManager.getByGuild(guildId).find(e => e.name.toLowerCase() === "the weaver of fate" && e.is_enabled) || null; }
    async sendAsWeaver(channel, content, components = [], executionState = null, reference = null) {
        const entity = this.entity(channel.guildId);
        if (!entity) throw new Error("The Weaver of Fate doit être active dans GreyCore");

        const access = await threadAccessService.ensureWritable(channel);
        if (!access.ready) {
            if (reference) referenceResolver.recordFailure(reference, access.error || access);
            throw threadAccessService.errorFor(access, "greyfate");
        }
        channel = access.channel || channel;

        const sent = await webhookManager.sendWithWebhook(channel, {
            username: entity.name,
            avatarURL: entity.avatar_url || undefined,
            embeds: [new EmbedBuilder().setColor(entity.embed_color).setDescription(content)],
            components,
            allowedMentions: { parse: [] }
        }, {
            onBeforeSendAttempt: () => {
                if (executionState) executionState.externalEffectAttempted = true;
            }
        });
        return sent.webhookMessage;
    }
    referenceForDuo(duo) { return { domain: "greyfate", ownerKey: `duo:${duo.duo_id || duo.duoId}`, resourceKind: "thread", discordId: duo.thread_id || duo.threadId, guildId: duo.guild_id || duo.guildId || null }; }
    async resolveDuoThread(duo) { const result = await referenceResolver.resolve(this.referenceForDuo(duo), { client: this.client }); if (!result.available) throw referenceResolver.errorFor(result, "greyfate"); return result.channel; }
    upsertDuo(payload, duo, now) { repository.upsertDuo(payload, duo, now); }
    async eventStarted(payload, executionState = { externalEffectAttempted: false }) { const now = new Date().toISOString(); this.initializeSchema(); repository.upsertEvent(payload, now); const failures = []; for (const duo of payload.duos || []) { if (!duo.threadId) continue; this.upsertDuo(payload, duo, now); const saved = this.duo(duo.duoId); if (saved.welcome_sent_at) continue; const reference = this.referenceForDuo(saved || duo); try { const channel = await this.resolveDuoThread(saved || duo); await this.sendAsWeaver(channel, `Les fils du destin se sont croisés. **${duo.maleCharacter}** et **${duo.femaleCharacter}**, votre histoire peut commencer.`, [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`greyfate_scene_start:${duo.duoId}`).setLabel("Commencer la scène").setEmoji("🧵").setStyle(ButtonStyle.Primary))], executionState, reference); repository.markWelcome(duo.duoId, now); } catch (error) { repository.markError(duo.duoId, error.message, now); failures.push(`${duo.duoId}: ${error.message}`); } } if (failures.length) throw new Error(`Accueil incomplet : ${failures.join(" | ")}`); }
    async closureDue(payload, executionState = { externalEffectAttempted: false }) { const duo = this.duo(payload.duoId); if (!duo || duo.closed_at || duo.closure_prompt_sent_at) return; const occurrence = new Date().toISOString(); const reference = this.referenceForDuo(duo); try { const channel = await this.resolveDuoThread(duo); await this.sendAsWeaver(channel, "Le fil de cette scène approche-t-il de son terme ?", [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(this.continueCustomId(duo.duo_id, occurrence)).setLabel("Continuer").setEmoji("▶️").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`greyfate_duo_close:${duo.duo_id}`).setLabel("Clôturer").setEmoji("🏁").setStyle(ButtonStyle.Danger))], executionState, reference); repository.markClosurePrompt(duo.duo_id, occurrence); } catch (error) { repository.markError(duo.duo_id, error.message, occurrence); throw error; } }
    async sendToFate(payload) { const url = process.env.GREYFATE_CALLBACK_URL, secret = process.env.GREYFATE_SHARED_SECRET; if (!url || !secret) throw new Error("Retour GreyFate non configuré"); const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 5000); try { const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${secret}` }, body: JSON.stringify(payload), signal: controller.signal }); if (!response.ok) throw new Error(`GreyFate HTTP ${response.status}`); return response.json(); } finally { clearTimeout(timeout); } }
    async sceneStart(duo, actorId) { if (duo.scene_started_at) return { duplicate: true }; await this.sendToFate({ type: "GREYCORE_SCENE_STARTED", operationKey: `${duo.event_id}:${duo.duo_id}:START`, eventId: duo.event_id, guildId: duo.guild_id, duoId: duo.duo_id, threadId: duo.thread_id, actorId }); const now = new Date().toISOString(); repository.markStarted(duo.duo_id, now); return { duplicate: false }; }
    async continueDuo(duo, actorId, occurrence, hours = 48) {
        const current = this.duo(duo?.duo_id);
        if (!current || current.closed_at) {
            throw new Error("Cette scène ne peut plus être prolongée.");
        }
        if (!occurrence || current.closure_prompt_sent_at !== occurrence) {
            throw new Error("Cette proposition de prolongation n’est plus active.");
        }
        const operationKey = `${current.event_id}:${current.duo_id}:CONTINUE:${occurrence}`;
        const response = await this.sendToFate({
            type: "GREYCORE_DUO_CONTINUE",
            operationKey,
            eventId: current.event_id,
            guildId: current.guild_id,
            duoId: current.duo_id,
            threadId: current.thread_id,
            hours,
            actorId
        });
        const completed = repository.markContinuedIfOccurrence(
            current.duo_id,
            occurrence,
            new Date().toISOString()
        );
        return {
            completed,
            duplicate: Boolean(response?.duplicate),
            operationKey
        };
    }
    async closeDuo(duo, actorId) { await this.sendToFate({ type: "GREYCORE_DUO_CLOSE", operationKey: `${duo.event_id}:${duo.duo_id}:CLOSE`, eventId: duo.event_id, guildId: duo.guild_id, duoId: duo.duo_id, threadId: duo.thread_id, actorId }); const now = new Date().toISOString(); repository.markClosed(duo.duo_id, now); }
    duo(id) { return repository.getDuo(id); }

    encodeOccurrence(occurrence) {
        return Buffer.from(String(occurrence), "utf8").toString("base64url");
    }

    decodeOccurrence(encoded) {
        if (!encoded || typeof encoded !== "string") return null;
        try {
            const decoded = Buffer.from(encoded, "base64url").toString("utf8");
            return this.encodeOccurrence(decoded) === encoded ? decoded : null;
        } catch {
            return null;
        }
    }

    continueCustomId(duoId, occurrence) {
        const customId = `greyfate_duo_continue:${duoId}:${this.encodeOccurrence(occurrence)}`;
        if (customId.length > 100) {
            throw new Error("Identifiant de continuation GreyFate trop long.");
        }
        return customId;
    }

    async buildLatestEventReport(guildId) {
        this.initializeSchema();
        const event = repository.getLatestEvent(guildId);
        if (!event) throw new Error("Aucune soirée duo GreyFate n’est enregistrée sur ce serveur.");
        const duos = repository.getDuosByEvent(event.event_id);
        const statistics = [];
        for (const duo of duos) {
            try {
                const channel = await this.resolveDuoThread(duo);
                const messages = await this.fetchChannelMessages(channel, 1000);
                const rp = messages.filter(message =>
                    String(message.content || "").trim()
                    && (!message.author?.bot || Boolean(message.webhookId))
                );
                const sorted = rp.sort((left, right) => left.createdTimestamp - right.createdTimestamp);
                const durationHours = sorted.length > 1
                    ? Math.max(1 / 60, (sorted.at(-1).createdTimestamp - sorted[0].createdTimestamp) / 3_600_000)
                    : 0;
                const gaps = sorted.slice(1).map((message, index) =>
                    (message.createdTimestamp - sorted[index].createdTimestamp) / 60_000
                );
                statistics.push({
                    duo,
                    count: sorted.length,
                    durationHours,
                    perHour: durationHours ? sorted.length / durationHours : sorted.length,
                    averageGap: gaps.length ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length : null,
                    opening: this.preview(sorted[0]?.content),
                    closing: this.preview(sorted.at(-1)?.content)
                });
            } catch {
                statistics.push({ duo, count: 0, durationHours: 0, perHour: 0, averageGap: null });
            }
        }
        const byVolume = [...statistics].sort((a, b) => b.count - a.count)[0];
        const byRhythm = [...statistics].filter(item => item.count >= 2).sort((a, b) => b.perHour - a.perHour)[0];
        const lines = statistics.sort((a, b) => b.count - a.count).map((item, index) => [
            `**${index + 1}. ${item.duo.male_character || "Personnage"} × ${item.duo.female_character || "Personnage"}**`,
            `💬 ${item.count} dialogue(s) · ⚡ ${item.perHour.toFixed(1)}/h${item.averageGap !== null ? ` · attente moyenne ${Math.round(item.averageGap)} min` : ""}`,
            item.opening || item.closing ? `Résumé factuel : ${item.opening || "…"}${item.closing && item.closing !== item.opening ? ` → ${item.closing}` : ""}` : "Résumé factuel indisponible."
        ].join("\n"));
        if (byVolume) lines.unshift(`🏆 **Plus de dialogues :** ${byVolume.duo.male_character} × ${byVolume.duo.female_character} (${byVolume.count})`);
        if (byRhythm) lines.unshift(`⚡ **Meilleur rythme :** ${byRhythm.duo.male_character} × ${byRhythm.duo.female_character} (${byRhythm.perHour.toFixed(1)} dialogues/h)`);
        return { eventId: event.event_id, duoCount: statistics.length, lines };
    }

    async fetchChannelMessages(channel, maximum = 1000) {
        const collected = [];
        let before;
        while (collected.length < maximum) {
            const batch = await channel.messages.fetch({ limit: Math.min(100, maximum - collected.length), ...(before ? { before } : {}) });
            if (!batch.size) break;
            collected.push(...batch.values());
            before = batch.last().id;
            if (batch.size < 100) break;
        }
        return collected;
    }

    preview(content) {
        const text = String(content || "").replace(/\s+/g, " ").trim();
        return text ? `« ${text.slice(0, 160)}${text.length > 160 ? "…" : ""} »` : null;
    }
}
module.exports = new GreyFateIntegrationService();
