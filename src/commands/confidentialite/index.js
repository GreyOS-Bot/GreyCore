const {
    SlashCommandBuilder
} = require("discord.js");

const privacyService =
    require(
        "../../v2/services/privacy/UserPrivacyService"
    );

const privacyView =
    require(
        "../../v2/views/privacy/PrivacyView"
    );

const {
    replyPrivate
} = require(
    "../../v2/core/services/InteractionResponseService"
);

const CONFIRMATION = "OUBLIER";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("confidentialite")
        .setDescription(
            "Consulte tes droits et gère tes données GreyCore."
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("politique")
                .setDescription(
                    "Affiche la politique de confidentialité."
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("charte")
                .setDescription(
                    "Affiche la charte d’utilisation."
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("mes-donnees")
                .setDescription(
                    "Affiche un résumé privé de tes données."
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("oublier")
                .setDescription(
                    "Supprime définitivement tes données GreyCore."
                )
                .addStringOption(option =>
                    option
                        .setName("confirmation")
                        .setDescription(
                            "Écris OUBLIER pour confirmer la suppression définitive"
                        )
                        .setRequired(true)
                        .setMaxLength(8)
                )
        ),

    async execute(interaction) {
        const subcommand =
            interaction.options.getSubcommand();

        if (subcommand === "politique") {
            return replyPrivate(
                interaction,
                privacyView.buildPolicy()
            );
        }

        if (subcommand === "charte") {
            return replyPrivate(
                interaction,
                privacyView.buildCharter()
            );
        }

        const userId = interaction.user.id;

        if (subcommand === "mes-donnees") {
            return replyPrivate(
                interaction,
                privacyView.buildSummary(
                    privacyService.getSummary(
                        userId
                    )
                )
            );
        }

        const confirmation =
            interaction.options.getString(
                "confirmation",
                true
            );

        if (
            confirmation.trim().toUpperCase()
            !== CONFIRMATION
        ) {
            return replyPrivate(
                interaction,
                "⚠️ Rien n’a été supprimé. Pour confirmer, écris exactement `OUBLIER` dans l’option `confirmation`."
            );
        }

        const erased =
            privacyService.erase(userId);

        return replyPrivate(
            interaction,
            [
                "✅ **GreyCore t’a oublié(e).**",
                "Tes personnages et les données qui leur étaient liées ont été supprimés définitivement.",
                "Les références nécessaires aux données d’autres joueurs ont été anonymisées.",
                "Les anciennes sauvegardes tournantes expireront automatiquement selon la durée annoncée dans la politique de confidentialité.",
                "",
                `Personnages supprimés : **${erased.globalCharacters + erased.legacyCharacters}**.`
            ].join("\n")
        );
    }
};
