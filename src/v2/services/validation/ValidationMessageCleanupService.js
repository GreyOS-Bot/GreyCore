class ValidationMessageCleanupService {
    async remove(client, installation) {
        if (
            !installation?.validation_channel_id
            || !installation.validation_message_id
        ) {
            return false;
        }

        try {
            const channel = await client.channels.fetch(
                installation.validation_channel_id
            );
            const message = await channel?.messages?.fetch(
                installation.validation_message_id
            );
            await message?.delete();
            return true;
        } catch {
            // L'installation reste annulée si la carte a déjà été supprimée.
            return false;
        }
    }
}

module.exports = new ValidationMessageCleanupService();
