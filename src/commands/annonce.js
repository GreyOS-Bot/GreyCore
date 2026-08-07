const {
    SlashCommandBuilder,
} = require("discord.js");
const announcementModal = require("../v2/modals/AnnouncementModal");

const {
    requireStaffCommandAccess
} = require(
    "../v2/core/services/StaffCommandAccessService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("annonce")
        .setDescription(
            "Publie une annonce dans le salon actuel."
        ),

    async execute(interaction) {
        if (
            !await requireStaffCommandAccess(
                interaction
            )
        ) {
            return;
        }

        return interaction.showModal(announcementModal.build());
    }
};
