const { SlashCommandBuilder } = require("discord.js");

const relationshipTypeManager =
    require("../../managers/RelationshipTypeManager");

const staffPermissionDecisionService = require(
    "../../v2/core/services/StaffPermissionDecisionService"
);
const { replyError } = require(
    "../../v2/core/services/InteractionResponseService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("relationtype")
        .setDescription("Gère les types de relations du serveur.")
        .addSubcommand(sub =>
            sub
                .setName("creer")
                .setDescription("Crée un nouveau type de relation.")
                .addStringOption(option =>
                    option
                        .setName("cle")
                        .setDescription("Clé interne, par exemple parent")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("a_vers_b")
                        .setDescription("Libellé du personnage A vers B")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("b_vers_a")
                        .setDescription("Libellé du personnage B vers A")
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName("symetrique")
                        .setDescription(
                            "La relation est-elle identique dans les deux sens ?"
                        )
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        if (!staffPermissionDecisionService.decide({
            interaction,
            permission: "relationships",
            write: true
        }).allowed) {
            return replyError(
                interaction,
                "Cette action nécessite la permission `relationships/write`."
            );
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand !== "creer") return;

        const key = interaction.options.getString("cle");
        const labelAToB = interaction.options.getString("a_vers_b");
        const labelBToA = interaction.options.getString("b_vers_a");
        const isSymmetric =
            interaction.options.getBoolean("symetrique");

        try {
            const type = relationshipTypeManager.createType({
                guildId: interaction.guild.id,
                key,
                labelAToB,
                labelBToA,
                isSymmetric
            });

            return interaction.reply({
                content:
                    `✅ Type de relation créé : **${type.label_a_to_b} / ${type.label_b_to_a}**`,
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
