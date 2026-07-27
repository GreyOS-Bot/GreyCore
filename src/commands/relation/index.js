const { SlashCommandBuilder } = require("discord.js");

const relationshipManager =
    require("../../managers/RelationshipManager");

const charactersAutocomplete =
    require("../../autocomplete/characters");

const relationshipTypesAutocomplete =
    require(
        "../../autocomplete/relationshipTypes"
    );

const guildModuleManager =
    require("../../v2/managers/GuildModuleV2Manager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("relation")
        .setDescription("Gère les relations entre personnages.")
        .addSubcommand(sub =>
            sub
                .setName("creer")
                .setDescription("Crée une relation entre deux personnages.")
                .addStringOption(option =>
                    option
                        .setName("personnage_a")
                        .setDescription("Premier personnage")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option
                        .setName("personnage_b")
                        .setDescription("Second personnage")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("Type de relation")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focusedOption =
            interaction.options.getFocused(
                true
            );

        if (
            focusedOption.name ===
                "personnage_a"
            ||
            focusedOption.name ===
                "personnage_b"
        ) {
            await charactersAutocomplete(
                interaction
            );

            return;
        }

        if (
            focusedOption.name ===
            "type"
        ) {
            await relationshipTypesAutocomplete(
                interaction
            );

            return;
        }

        await interaction.respond([]);
    },

    async execute(interaction) {
        if (
            !guildModuleManager.isEnabled(
                interaction.guildId,
                "relationships"
            )
        ) {
            return interaction.reply({
                content: "ℹ️ Le module Relations est désactivé sur ce serveur.",
                ephemeral: true
            });
        }

        const characterAId =
            interaction.options.getString("personnage_a");

        const characterBId =
            interaction.options.getString("personnage_b");

        const relationshipTypeId = Number(
            interaction.options.getString("type")
        );

        try {
            const relationship =
                relationshipManager.createRelationship({
                    guildId: interaction.guild.id,
                    characterAId,
                    characterBId,
                    relationshipTypeId,
                    createdBy: interaction.user.id
                });

            return interaction.reply({
                content:
                    `✅ Relation créée : **${relationship.label_a_to_b} / ${relationship.label_b_to_a}**`,
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
