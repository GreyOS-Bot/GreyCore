const {
    SlashCommandBuilder
} = require("discord.js");

const stateManager =
    require("../../managers/StateManager");

const staffPermissionDecisionService = require(
    "../../v2/core/services/StaffPermissionDecisionService"
);
const { replyError } = require(
    "../../v2/core/services/InteractionResponseService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("etattype")
        .setDescription("Gère les types d’états du serveur.")

        .addSubcommand(sub =>
            sub
                .setName("creer")
                .setDescription("Crée un nouveau type d’état.")

                .addStringOption(option =>
                    option
                        .setName("nom")
                        .setDescription(
                            "Nom de l’état, par exemple Blessé"
                        )
                        .setRequired(true)
                        .setMaxLength(50)
                )

                .addStringOption(option =>
                    option
                        .setName("emoji")
                        .setDescription(
                            "Emoji affiché devant l’état (facultatif)"
                        )
                        .setRequired(false)
                        .setMaxLength(50)
                )

                .addStringOption(option =>
                    option
                        .setName("couleur")
                        .setDescription(
                            "Couleur hexadécimale (facultatif), par exemple #ED4245"
                        )
                        .setRequired(false)
                        .setMaxLength(7)
                )
        ),

    async execute(interaction) {
        if (!staffPermissionDecisionService.decide({
            interaction,
            permission: "characters",
            write: true
        }).allowed) {
            return replyError(
                interaction,
                "Cette action nécessite la permission `characters/write`."
            );
        }

        const subcommand =
            interaction.options.getSubcommand();

        if (subcommand !== "creer") return;

        const name =
            interaction.options.getString("nom");

        const emoji =
            interaction.options.getString("emoji");

        const color =
            interaction.options.getString("couleur");

        if (
            color &&
            !/^#[0-9A-Fa-f]{6}$/.test(color)
        ) {
            return interaction.reply({
                content:
                    "❌ La couleur doit être au format hexadécimal, par exemple `#ED4245`.",
                ephemeral: true
            });
        }

        try {
            const stateType =
                stateManager.createStateType({
                    guildId: interaction.guild.id,
                    name,
                    emoji,
                    color,
                    createdBy: interaction.user.id
                });

            const displayEmoji =
                stateType.emoji || "❤️‍🩹";

            return interaction.reply({
                content:
                    `✅ Type d’état créé : ${displayEmoji} **${stateType.name}**`,
                ephemeral: true
            });
        } catch (error) {
            return interaction.reply({
                content: `❌ ${error.message}`,
                ephemeral: true
            });
        }
    }
};
