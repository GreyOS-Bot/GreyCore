const CALLBACK_TYPE_DEFERRED_UPDATE = 6;
const CALLBACK_TYPE_DEFERRED_REPLY = 5;
const EPHEMERAL_FLAG = 64;

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

        const response = await fetch(
            `https://discord.com/api/v10/interactions/${encodeURIComponent(interaction.id)}/${encodeURIComponent(interaction.token)}/callback`,
            {
                method: "POST",
                headers: {
                    "content-type":
                        "application/json"
                },
                body: JSON.stringify({
                    type:
                        CALLBACK_TYPE_DEFERRED_REPLY,
                    ...(ephemeral
                        ? {
                            data: {
                                flags:
                                    EPHEMERAL_FLAG
                            }
                        }
                        : {})
                }),
                signal:
                    AbortSignal.timeout(2_500)
            }
        );

        if (!response.ok) {
            const error = new Error(
                `Discord a refusé la confirmation rapide (${response.status}).`
            );

            error.status = response.status;
            throw error;
        }

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

        const response = await fetch(
            `https://discord.com/api/v10/interactions/${encodeURIComponent(interaction.id)}/${encodeURIComponent(interaction.token)}/callback`,
            {
                method: "POST",
                headers: {
                    "content-type":
                        "application/json"
                },
                body: JSON.stringify({
                    type:
                        CALLBACK_TYPE_DEFERRED_UPDATE
                }),
                signal:
                    AbortSignal.timeout(2_500)
            }
        );

        if (!response.ok) {
            const body = await response.text();
            const error = new Error(
                `Discord a refusé la confirmation rapide (${response.status}).`
            );

            error.status = response.status;
            error.discordResponse = body;

            throw error;
        }

        interaction.deferred = true;
    }
}

module.exports =
    new FastInteractionAcknowledgementService();
