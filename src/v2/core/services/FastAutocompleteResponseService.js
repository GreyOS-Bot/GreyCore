const CALLBACK_TYPE_AUTOCOMPLETE = 8;
const MAX_CHOICES = 25;
const MAX_NAME_LENGTH = 100;
const MAX_STRING_VALUE_LENGTH = 100;

class FastAutocompleteResponseService {
    constructor() {
        this.attempts = new WeakMap();
    }

    async respond(
        interaction,
        choices
    ) {
        if (interaction.responded) {
            return;
        }

        const existing = this.attempts.get(interaction);
        if (existing) {
            return existing;
        }

        const safeChoices = this.normalizeChoices(choices);
        const attempt = this.send(interaction, safeChoices);
        this.attempts.set(interaction, attempt);

        return attempt;
    }

    hasAttempted(interaction) {
        return this.attempts.has(interaction);
    }

    async send(interaction, choices) {
        if (!interaction.id || !interaction.token) {
            await interaction.respond(choices);
            interaction.responded = true;
            return;
        }

        const response = await fetch(
            `https://discord.com/api/v10/interactions/${encodeURIComponent(interaction.id)}/${encodeURIComponent(interaction.token)}/callback`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    type: CALLBACK_TYPE_AUTOCOMPLETE,
                    data: {
                        choices
                    }
                }),
                signal:
                    AbortSignal.timeout(2_500)
            }
        );

        if (!response.ok) {
            const error = new Error(
                `Discord a refusé l’autocomplétion rapide (${response.status}).`
            );

            error.status = response.status;
            throw error;
        }

        interaction.responded = true;
    }

    normalizeChoices(choices) {
        if (!Array.isArray(choices)) {
            return [];
        }

        const values = new Set();
        const normalized = [];

        for (const choice of choices) {
            if (!this.isValidChoice(choice)) {
                continue;
            }

            const valueKey = `${typeof choice.value}:${String(choice.value)}`;
            if (values.has(valueKey)) {
                continue;
            }

            values.add(valueKey);
            normalized.push({
                name: choice.name.slice(0, MAX_NAME_LENGTH),
                value: choice.value
            });

            if (normalized.length === MAX_CHOICES) {
                break;
            }
        }

        return normalized;
    }

    isValidChoice(choice) {
        if (!choice || typeof choice !== "object") {
            return false;
        }
        if (typeof choice.name !== "string" || !choice.name.trim()) {
            return false;
        }
        if (typeof choice.value === "string") {
            return choice.value.length > 0
                && choice.value.length <= MAX_STRING_VALUE_LENGTH;
        }
        return typeof choice.value === "number"
            && Number.isFinite(choice.value);
    }
}

module.exports =
    new FastAutocompleteResponseService();
