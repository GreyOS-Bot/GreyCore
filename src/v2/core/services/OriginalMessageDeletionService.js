const MAX_DIRECT_ATTEMPTS = 2;

class OriginalMessageDeletionService {
    async delete(message) {
        try {
            await message.delete();
            return;
        } catch (error) {
            if (
                !this.isTemporary(error)
                || !message.client?.token
            ) {
                throw error;
            }
        }

        let lastError;

        for (
            let attempt = 0;
            attempt < MAX_DIRECT_ATTEMPTS;
            attempt += 1
        ) {
            if (attempt > 0) {
                await this.wait(250);
            }

            try {
                await this.deleteDirectly(message);
                return;
            } catch (error) {
                lastError = error;

                if (!this.isTemporary(error)) {
                    throw error;
                }
            }
        }

        throw lastError;
    }

    async deleteDirectly(message) {
        const response = await fetch(
            `https://discord.com/api/v10/channels/${encodeURIComponent(message.channel.id)}/messages/${encodeURIComponent(message.id)}`,
            {
                method: "DELETE",
                headers: {
                    authorization:
                        `Bot ${message.client.token}`
                },
                signal:
                    AbortSignal.timeout(2_500)
            }
        );

        if (response.ok || response.status === 404) {
            return;
        }

        const error = new Error(
            `Discord a refusé la suppression du message original (${response.status}).`
        );

        error.status = response.status;
        throw error;
    }

    isTemporary(error) {
        const status =
            Number(error?.status)
            || Number(error?.rawError?.status);

        return (
            status === 429
            || status >= 500
            || error?.name === "AbortError"
            || error?.name === "TimeoutError"
            || error instanceof TypeError
        );
    }

    wait(milliseconds) {
        return new Promise(resolve => {
            setTimeout(resolve, milliseconds);
        });
    }
}

module.exports =
    new OriginalMessageDeletionService();
