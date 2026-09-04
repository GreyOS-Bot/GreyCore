const {
    SlashCommandBuilder
} = require("discord.js");

const relationshipManager =
    require("../managers/RelationshipManager");

const staffPermissionDecisionService = require(
    "../v2/core/services/StaffPermissionDecisionService"
);
const { replyError } = require(
    "../v2/core/services/InteractionResponseService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("installer-relations")
        .setDescription(
            "Installe tous les types de relations par défaut."
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
