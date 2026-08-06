class DiscordUserDisplayService {
    constructor() {
        this.displays = new Map();
    }

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

        const missing = [];

        ids.forEach(discordUserId => {
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

                const cachedUser =
                    interaction.client?.users
                        ?.cache
                        ?.get(discordUserId);
                const knownDisplay =
                    cachedUser?.globalName
                    || cachedUser?.username
                    || this.displays.get(
                        discordUserId
                    );

                if (knownDisplay) {
                    displays.set(
                        discordUserId,
                        knownDisplay
                    );
                    return;
                }

                displays.set(
                    discordUserId,
                    discordUserId
                );
                missing.push(discordUserId);
            });

        this.warmLater(
            interaction,
            missing
        );

        return displays;
    }

    warmLater(
        interaction,
        discordUserIds
    ) {
        if (discordUserIds.length === 0) {
            return;
        }

        const timer = setTimeout(() => {
            Promise.all(
                discordUserIds.map(
                    discordUserId =>
                        this.fetchDisplay(
                            interaction,
                            discordUserId
                        )
                )
            ).catch(() => null);
        }, 0);

        timer.unref?.();
    }

    async fetchDisplay(
        interaction,
        discordUserId
    ) {
        const members = interaction.guild?.members;
        const member = typeof members?.fetch === "function"
            ? await members.fetch(discordUserId)
                .catch(() => null)
            : null;
        const users = interaction.client?.users;
        const user = member
            ? null
            : typeof users?.fetch === "function"
                ? await users.fetch(discordUserId)
                    .catch(() => null)
                : null;
        const display =
            member?.displayName
            || user?.globalName
            || user?.username;

        if (display) {
            this.displays.set(
                discordUserId,
                display
            );
        }
    }
}

module.exports =
    new DiscordUserDisplayService();
