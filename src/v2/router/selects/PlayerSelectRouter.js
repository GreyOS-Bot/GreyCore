module.exports = async interaction => {
    if (!interaction.isStringSelectMenu?.()) return false;
    if (interaction.customId === "v2_player_directory_character") {
        await require("../../pages/character/OpenCharacterDashboardPage")
            .execute(interaction, interaction.values[0]);
        return true;
    }
    if (interaction.customId?.startsWith("v2_player_directory_letter_")) {
        const characters = require("../../managers/CharacterRosterV2Manager")
            .getRoster(interaction.guildId, { includeArchived: false });
        await interaction.update(
            require("../../views/player/PlayerDirectoryView").build(characters, {
                letter: interaction.values[0],
                page: 0
            })
        );
        return true;
    }
    if (interaction.customId !== "v2_player_help_topic") return false;
    const guide = require("../../views/help/GettingStartedGuideView").build(interaction.values[0]);
    await interaction.update({
        ...guide,
        components: [require("../../views/player/PlayerHelpView").navigationRow()]
    });
    return true;
};
