const CALLBACK_TYPE_AUTOCOMPLETE = 8;

class FastAutocompleteResponseService {
    async respond(
        interaction,
        choices
    ) {
        if (interaction.responded) {
            return;
        }

        if (!interaction.id || !interaction.token) {
            await interaction.respond(choices);
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
}

module.exports =
    new FastAutocompleteResponseService();
