const CALLBACK_TYPE_DEFERRED_UPDATE = 6;
const CALLBACK_TYPE_DEFERRED_REPLY = 5;
const CALLBACK_TYPE_MODAL = 9;
const EPHEMERAL_FLAG = 64;
const CALLBACK_TIMEOUT_MS = 1_200;
const DISCORD_ALREADY_ACKNOWLEDGED = 40060;

class FastInteractionAcknowledgementService {
    async deferReply(
        interaction,
        { ephemeral = false } = {}
    ) {
        if (
            interaction.deferred
            || interaction.replied
        ) {
            return;
        }

        if (!interaction.id || !interaction.token) {
            await interaction.deferReply(
                ephemeral
                    ? { flags: EPHEMERAL_FLAG }
                    : {}
            );
            return;
        }

        await this.sendCallback(interaction, {
            type: CALLBACK_TYPE_DEFERRED_REPLY,
            ...(ephemeral ? { data: { flags: EPHEMERAL_FLAG } } : {})
        });

        interaction.deferred = true;
        interaction.ephemeral = ephemeral;
    }

    async deferComponentUpdate(interaction) {
        if (
            interaction.deferred
            || interaction.replied
        ) {
            return;
        }

        /*
         * Les doublures de tests et les interactions partielles ne
         * possèdent pas toujours le couple id/token. Dans ce cas,
         * discord.js reste le meilleur mécanisme disponible.
         */
        if (!interaction.id || !interaction.token) {
            await interaction.deferUpdate();
            return;
        }

        await this.sendCallback(interaction, {
            type: CALLBACK_TYPE_DEFERRED_UPDATE
        });

        interaction.deferred = true;
    }

    async showModal(interaction, modal) {
        if (!interaction.id || !interaction.token) {
            return interaction.showModal(modal);
        }
        await this.sendCallback(interaction, {
            type: CALLBACK_TYPE_MODAL,
            data: typeof modal?.toJSON === "function" ? modal.toJSON() : modal
        });
        interaction.replied = true;
    }

    async sendCallback(interaction, payload) {
        const url = `https://discord.com/api/v10/interactions/${encodeURIComponent(interaction.id)}/${encodeURIComponent(interaction.token)}/callback`;
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(CALLBACK_TIMEOUT_MS)
                });
                if (response.ok) return;
                const body = await response.text();
                const discordCode = parseDiscordCode(body);
                if (discordCode === DISCORD_ALREADY_ACKNOWLEDGED) return;
                const error = new Error(
                    `Discord a refusé la confirmation rapide (${response.status}).`
                );
                error.status = response.status;
                error.discordResponse = body;
                throw error;
            } catch (error) {
                lastError = error;
                if (!isTimeout(error) || attempt === 1) throw error;
            }
        }
        throw lastError;
    }
}

function parseDiscordCode(body) {
    try { return Number(JSON.parse(body)?.code) || null; } catch { return null; }
}

function isTimeout(error) {
    return error?.name === "TimeoutError"
        || error?.name === "AbortError"
        || Number(error?.code) === 23;
}

module.exports =
    new FastInteractionAcknowledgementService();
