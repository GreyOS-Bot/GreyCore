const {
    SlashCommandBuilder,
} = require("discord.js");

const pendingValidationsView = require(
    "../../v2/views/validation/PendingValidationsView"
);

const validationManager =
    require(
        "../../v2/services/validation/ValidationManagerV2"
    );

const validationPermissionAccess = require(
    "../../v2/core/services/ValidationPermissionAccessService"
);

const {
    deferPrivate,
    replyPrivate
} = require(
    "../../v2/core/services/InteractionResponseService"
);

const validationMessageCleanup = require(
    "../../v2/services/validation/ValidationMessageCleanupService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("validations")
        .setDescription(
            "Consulte les demandes de validation du serveur."
        )
        .addSubcommand(sub =>
            sub
                .setName("attente")
                .setDescription(
                    "Affiche les demandes actuellement en attente."
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("annuler")
                .setDescription(
                    "Annule une installation non aboutie."
                )
                .addStringOption(option =>
                    option
                        .setName("personnage")
                        .setDescription(
                            "Personnage et installation à annuler"
                        )
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option
                        .setName("raison")
                        .setDescription(
                            "Motif conservé dans l’historique"
                        )
                        .setRequired(true)
                        .setMaxLength(500)
                )
        ),

    async autocomplete(interaction) {
        const focused =
            interaction.options.getFocused(true);

        if (focused.name !== "personnage") {
            return interaction.respond([]);
        }

        if (!validationPermissionAccess.canWrite(interaction)) {
            return interaction.respond([]);
        }

        const installations =
            validationManager
                .searchIncompleteForGuild(
                    interaction.guildId,
                    focused.value
                );

        return interaction.respond(
            installations.map(installation => ({
                name: formatIncompleteChoice(
                    interaction,
                    installation
                ).slice(0, 100),
                value: String(installation.id)
            }))
        );
    },

    async execute(interaction) {
        const subcommand =
            interaction.options?.getSubcommand?.()
            || "attente";

        const allowed = subcommand === "annuler"
            ? validationPermissionAccess.canWrite(interaction)
            : validationPermissionAccess.canRead(interaction);
        if (!allowed) {
            return replyPrivate(
                interaction,
                "Cette commande est réservée au staff chargé des personnages."
            );
        }

        if (subcommand === "annuler") {
            await deferPrivate(interaction);

            const installationId =
                interaction.options.getString(
                    "personnage",
                    true
                );
            const reason =
                interaction.options.getString(
                    "raison",
                    true
                );

            const previousInstallation =
                validationManager.getInstallation(
                    installationId
                );

            const result =
                validationManager
                    .cancelIncompleteInstallation({
                        installationId,
                        guildId: interaction.guildId,
                        cancelledBy:
                            interaction.user.id,
                        reason
                    });

            await validationMessageCleanup.remove(
                interaction.client,
                previousInstallation
            );

            return replyPrivate(
                interaction,
                `✅ L’installation de **${result.context.proxy_name}** a été annulée. Le personnage n’a pas été supprimé.`
            );
        }

        const pending =
            validationManager
                .getPendingForGuild(
                    interaction.guildId
                );

        return replyPrivate(
            interaction,
            pendingValidationsView.build(
                interaction.guildId,
                pending
            )
        );
    }
};

module.exports.buildPendingView = pendingValidationsView.build;

function formatIncompleteChoice(
    interaction,
    installation
) {
    const owner =
        interaction.guild?.members?.cache
            ?.get(installation.owner_id)
            ?.displayName
        || installation.owner_id;
    const name =
        installation.firstname
        || installation.proxy_name;
    const familyName =
        installation.lastname
            ? ` ${installation.lastname}`
            : "";

    return `${name}${familyName} — ${owner} — ${installation.status}`;
}
