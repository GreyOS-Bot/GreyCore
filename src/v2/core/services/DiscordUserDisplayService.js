class DiscordUserDisplayService {
    async resolveMany(
        interaction,
        discordUserIds
    ) {
        const ids = [
            ...new Set(
                discordUserIds
                    .filter(Boolean)
                    .map(String)
            )
        ];
        const displays = new Map();

        await Promise.all(
            ids.map(async discordUserId => {
                const cachedMember =
                    interaction.guild?.members
                        ?.cache
                        ?.get(discordUserId);

                if (cachedMember?.displayName) {
                    displays.set(
                        discordUserId,
                        cachedMember.displayName
                    );
                    return;
                }

                const fetchedMember =
                    await interaction.guild?.members
                        ?.fetch?.(discordUserId)
                        .catch(() => null);

                if (fetchedMember?.displayName) {
                    displays.set(
                        discordUserId,
                        fetchedMember.displayName
                    );
                    return;
                }

                const user =
                    await interaction.client?.users
                        ?.fetch?.(discordUserId)
                        .catch(() => null);

                displays.set(
                    discordUserId,
                    user?.globalName
                    || user?.username
                    || discordUserId
                );
            })
        );

        return displays;
    }
}

module.exports =
    new DiscordUserDisplayService();
