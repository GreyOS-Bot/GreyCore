const {
    SlashCommandBuilder
} = require("discord.js");

const relationshipManager =
    require("../managers/RelationshipManager");

const {
    requireStaffCommandAccess
} = require(
    "../v2/core/services/StaffCommandAccessService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("installer-relations")
        .setDescription(
            "Installe tous les types de relations par défaut."
        ),

    async execute(interaction) {
        if (
            !await requireStaffCommandAccess(
                interaction
            )
        ) {
            return;
        }

        const types =
            relationshipManager.installDefaultRelationshipTypes(
                interaction.guild.id
            );

        return interaction.reply({
            content:
                `✅ ${types.length} types de relations sont maintenant disponibles.`,
            ephemeral: true
        });
    }
};
