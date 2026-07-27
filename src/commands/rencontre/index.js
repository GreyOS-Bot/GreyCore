const { SlashCommandBuilder } = require("discord.js");

const encounterManager =
    require("../../managers/EncounterManager");

const charactersAutocomplete =
    require("../../autocomplete/characters");

const guildModuleManager =
    require("../../v2/managers/GuildModuleV2Manager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rencontre")
        .setDescription("Gère les rencontres entre personnages.")

        .addSubcommand(sub =>
            sub
                .setName("creer")
                .setDescription("Enregistre une rencontre entre deux personnages.")

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
                        .setName("lieu")
                        .setDescription("Lieu de la rencontre (facultatif)")
                        .setRequired(false)
                        .setMaxLength(100)
                )

                .addStringOption(option =>
                    option
                        .setName("note")
                        .setDescription("Contexte ou résumé de la rencontre (facultatif)")
                        .setRequired(false)
                        .setMaxLength(1000)
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

        await interaction.respond([]);
    },

    async execute(interaction) {
        if (
            !guildModuleManager.isEnabled(
                interaction.guildId,
                "encounters"
            )
        ) {
            return interaction.reply({
                content: "ℹ️ Le module Rencontres est désactivé sur ce serveur.",
                ephemeral: true
            });
        }

        const characterAId =
            interaction.options.getString("personnage_a");

        const characterBId =
            interaction.options.getString("personnage_b");

        const location =
            interaction.options.getString("lieu");

        const note =
            interaction.options.getString("note");

        try {
            const encounter =
                encounterManager.createEncounter({
                    guildId: interaction.guild.id,
                    characterAId,
                    characterBId,
                    location,
                    note,
                    createdBy: interaction.user.id
                });

            return interaction.reply({
                content:
                    `✅ Rencontre enregistrée avec succès.\n` +
                    `📅 <t:${Math.floor(
                        new Date(encounter.occurredAt).getTime() / 1000
                    )}:F>`,
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
