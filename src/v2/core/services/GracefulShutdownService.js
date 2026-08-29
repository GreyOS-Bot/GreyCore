const {
    sanitizeError
} = require("./TechnicalErrorSanitizer");

const DEFAULT_TIMEOUT_MS = 15_000;

class GracefulShutdownService {
    constructor({
        greyFateService,
        sceneInactivityService,
        narrativeEntityScheduler,
        databaseBackupService,
        getProductProjectionPublisher = () => null,
        client,
        database,
        processObject = process,
        log,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        scheduleTimeout = setTimeout,
        cancelTimeout = clearTimeout,
        forceExit = code => processObject.exit(code)
    }) {
        this.greyFateService = greyFateService;
        this.sceneInactivityService = sceneInactivityService;
        this.narrativeEntityScheduler = narrativeEntityScheduler;
        this.databaseBackupService = databaseBackupService;
        this.getProductProjectionPublisher =
            getProductProjectionPublisher;
        this.client = client;
        this.database = database;
        this.processObject = processObject;
        this.log = log;
        this.timeoutMs = timeoutMs;
        this.scheduleTimeout = scheduleTimeout;
        this.cancelTimeout = cancelTimeout;
        this.forceExit = forceExit;
        this.shutdownPromise = null;
        this.handlersInstalled = false;
    }

    installProcessHandlers() {
        if (this.handlersInstalled) return;
        this.handlersInstalled = true;

        for (const signal of ["SIGINT", "SIGTERM"]) {
            this.processObject.once(
                signal,
                () => {
                    void this.shutdown({
                        reason: signal
                    });
                }
            );
        }

        this.processObject.once(
            "uncaughtException",
            error => {
                this.handleFatal(
                    "uncaughtException",
                    error
                );
            }
        );
        this.processObject.once(
            "unhandledRejection",
            reason => {
                this.handleFatal(
                    "unhandledRejection",
                    reason
                );
            }
        );
    }

    handleFatal(type, reason) {
        this.processObject.exitCode = 1;
        this.safeLog(
            "error",
            `Erreur process fatale (${type}).`,
            reason
        );

        try {
            void this.shutdown({
                reason: type,
                fatal: true
            });
        } catch {
            // Le handler process ne doit jamais relancer une exception.
        }
    }

    shutdown({ reason = "manual", fatal = false } = {}) {
        if (fatal) {
            this.processObject.exitCode = 1;
        }

        if (this.shutdownPromise) {
            return this.shutdownPromise;
        }

        let timeout = null;

        this.shutdownPromise = (async () => {
            timeout = this.scheduleTimeout(
                () => {
                    this.processObject.exitCode = 1;
                    this.safeLog(
                        "error",
                        "Délai maximal du graceful shutdown dépassé.",
                        reason
                    );

                    try {
                        this.forceExit(
                            1
                        );
                    } catch {
                        // Aucun nouvel échec ne doit naître du fallback fatal.
                    }
                },
                this.timeoutMs
            );
            timeout.unref?.();

            await this.performStep(
                "GreyFate HTTP",
                () => this.greyFateService?.stop?.()
            );
            await this.performStep(
                "Scene inactivity",
                () => this.sceneInactivityService?.stop?.()
            );
            await this.performStep(
                "Narrative entity scheduler",
                () => this.narrativeEntityScheduler?.stop?.()
            );
            await this.performStep(
                "Database backup",
                async () => {
                    this.databaseBackupService?.stop?.();
                    if (
                        this.databaseBackupService
                            ?.pendingBackup
                    ) {
                        await this.databaseBackupService
                            .pendingBackup;
                    }
                }
            );
            await this.performStep(
                "GreyOS projection publisher",
                () => this.getProductProjectionPublisher()
                    ?.stop?.()
            );
            await this.performStep(
                "Discord client",
                () => this.client?.destroy?.()
            );
            await this.performStep(
                "SQLite database",
                () => {
                    if (this.database?.open !== false) {
                        return this.database?.close?.();
                    }
                }
            );
        })().finally(
            () => {
                if (timeout) {
                    this.cancelTimeout(timeout);
                }
            }
        );

        return this.shutdownPromise;
    }

    async performStep(name, action) {
        try {
            await action();
        } catch (error) {
            this.safeLog(
                "error",
                `Échec pendant l’arrêt de ${name}.`,
                error
            );
        }
    }

    safeLog(level, message, error) {
        const diagnostic =
            sanitizeError(error);

        try {
            this.log?.[level]?.(
                message,
                diagnostic
            );
            return;
        } catch {
            // Le shutdown continue même si le journal central échoue.
        }
    }
}

module.exports = {
    GracefulShutdownService,
    DEFAULT_TIMEOUT_MS
};
