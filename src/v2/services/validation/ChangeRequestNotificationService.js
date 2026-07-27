class ChangeRequestNotificationService {
    async notify({
        client,
        requesterId,
        characterName,
        guildName,
        status,
        reason = null
    }) {
        if (!client || !requesterId) {
            return false;
        }

        let user =
            client.users?.cache?.get(
                String(requesterId)
            )
            || null;

        if (
            !user
            && typeof client.users?.fetch ===
                "function"
        ) {
            user = await client.users
                .fetch(
                    String(requesterId)
                )
                .catch(() => null);
        }

        if (!user) {
            return false;
        }

        const accepted = status === "approved";

        try {
            await user.send({
                embeds: [
                    {
                        color:
                            accepted
                                ? 0x57F287
                                : 0xED4245,
                        title:
                            accepted
                                ? "✅ Modification validée"
                                : "❌ Modification refusée",
                        description: [
                            `La demande de modification de **${characterName || "ton personnage"}** a été ${accepted ? "validée" : "refusée"} sur **${guildName || "ce serveur"}**.`,
                            !accepted && reason
                                ? `\nMotif : ${reason}`
                                : null
                        ].filter(Boolean).join("\n")
                    }
                ]
            });

            return true;
        } catch {
            return false;
        }
    }
}

module.exports =
    new ChangeRequestNotificationService();
