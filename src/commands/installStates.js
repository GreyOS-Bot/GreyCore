const {
    SlashCommandBuilder
} = require("discord.js");

const stateManager =
    require("../managers/StateManager");

const {
    requireStaffCommandAccess
} = require(
    "../v2/core/services/StaffCommandAccessService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("installer-etats")
        .setDescription(
            "Installe les types d’états par défaut."
        ),

    async execute(interaction) {
        if (
            !await requireStaffCommandAccess(
                interaction
            )
        ) {
            return;
        }

        const before =
            stateManager.getStateTypesByGuild(
                interaction.guild.id
            ).length;

        const states =
            stateManager.installDefaultStateTypes(
                interaction.guild.id,
                interaction.user.id
            );

        const added =
            states.length - before;

        return interaction.reply({
            content:
                `✅ ${added} nouvel état ajouté.\n` +
                `📋 ${states.length} types d’états disponibles au total.`,
            ephemeral: true
        });
    }
};
