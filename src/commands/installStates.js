const {
    SlashCommandBuilder
} = require("discord.js");

const stateManager =
    require("../managers/StateManager");

const staffPermissionDecisionService = require(
    "../v2/core/services/StaffPermissionDecisionService"
);
const { replyError } = require(
    "../v2/core/services/InteractionResponseService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("installer-etats")
        .setDescription(
            "Installe les types d’états par défaut."
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
