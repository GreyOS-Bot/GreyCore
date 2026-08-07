const { SlashCommandBuilder } = require("discord.js");
const staffCenterPage = require("../../v2/pages/staff/StaffCenterPage");
const staffPermissionPolicy = require("../../v2/core/policies/StaffPermissionPolicy");
const guildRepository = require("../../v2/repositories/GuildRepository");
const { replyError, replyPrivate } = require(
    "../../v2/core/services/InteractionResponseService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("staff")
        .setDescription("Ouvre le centre d'administration GreyCore."),

    async execute(interaction) {
        if (!interaction.guildId) {
            return replyError(
                interaction,
                "Le centre d'administration doit être ouvert sur un serveur."
            );
        }
        if (!staffPermissionPolicy.canOpenCenter(interaction)) {
            return replyError(
                interaction,
                "Tu ne disposes d'aucune autorisation d'administration GreyCore."
            );
        }

        guildRepository.ensure(
            interaction.guildId,
            interaction.guild?.name || "Serveur Discord",
            new Date().toISOString()
        );

        return replyPrivate(
            interaction,
            staffCenterPage.build(interaction)
        );
    }
};
