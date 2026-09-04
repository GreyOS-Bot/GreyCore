const {
    SlashCommandBuilder
} = require("discord.js");

const guildSettingsManager =
    require(
        "../v2/managers/GuildSettingsV2Manager"
    );

const administrativeAccess =
    require(
        "../v2/core/services/AdministrativePermissionAccessService"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../v2/core/services/InteractionResponseService"
);

module.exports = {
    data:
        new SlashCommandBuilder()
            .setName("maintenance")
            .setDescription(
                "Met GreyCore en pause sur ce serveur (staff)."
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("activer")
                    .setDescription(
                        "Met GreyCore en pause et coupe les journaux d'erreurs."
                    )
                    .addStringOption(option =>
                        option
                            .setName("message")
                            .setDescription(
                                "Message affiché aux utilisateurs pendant la maintenance."
                            )
                            .setMaxLength(500)
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("desactiver")
                    .setDescription(
                        "Remet GreyCore en service."
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("statut")
                    .setDescription(
                        "Affiche l'état actuel de GreyCore."
                    )
            ),

    async execute(interaction) {
        const action =
            interaction.options
                .getSubcommand();

        const allowed = action === "statut"
            ? administrativeAccess.canRead(
                interaction,
                "settings"
            )
            : (
                action === "activer"
                || action === "desactiver"
            ) && administrativeAccess.canWrite(
                interaction,
                "settings"
            );

        if (!allowed) {
            return replyError(
                interaction,
                "Tu n’as pas la permission GreyCore requise pour gérer la maintenance."
            );
        }

        if (action === "activer") {
            const message =
                interaction.options
                    .getString("message");

            guildSettingsManager
                .setMaintenance(
                    interaction.guildId,
                    {
                        enabled: true,
                        message
                    }
                );

            return replyPrivate(
                interaction,
                "🛠️ Maintenance activée. Les actions, proxies et journaux d’erreurs de GreyCore sont maintenant en pause sur ce serveur."
            );
        }

        if (action === "desactiver") {
            guildSettingsManager
                .setMaintenance(
                    interaction.guildId,
                    {
                        enabled: false,
                        message: null
                    }
                );

            return replyPrivate(
                interaction,
                "✅ Maintenance terminée. GreyCore fonctionne de nouveau normalement sur ce serveur."
            );
        }

        const maintenance =
            guildSettingsManager
                .getMaintenance(
                    interaction.guildId
                );

        return replyPrivate(
            interaction,
            maintenance.enabled
                ? `🛠️ Maintenance active.\nMessage : ${maintenance.message}`
                : "✅ GreyCore fonctionne normalement sur ce serveur."
        );
    }
};
