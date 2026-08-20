module.exports = async interaction => {
    if (!interaction.isStringSelectMenu?.()) return false;
    if (interaction.customId === "v2_player_archives_select") {
        const v2 = require("../../index");
        const user = v2.managers.user.getOrCreate(interaction.user.id);
        const character = v2.managers.library.getCharacterForUser(interaction.values[0], user.id);
        if (!character || !character.is_archived) {
            await interaction.update({ content: "❌ Ce personnage archivé est introuvable.", embeds: [], components: [] });
            return true;
        }
        await interaction.update(
            require("../../views/player/PlayerArchivesView").buildRestoreConfirmation(character)
        );
        return true;
    }
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
    const value = String(interaction.values[0]).toLowerCase();
    const legacy = {
        personnages: "player_character",
        relations: "player_relations",
        etats: "player_states",
        telephone: "player_phone",
        biens: "player_bank",
        scenes: "player_scenes",
        confidentialite: "docs_privacy"
    };
    const topic = legacy[value] || value;
    const guide = require("../../views/help/GettingStartedGuideView").build(topic);
    await interaction.update({
        ...guide,
        components: [require("../../views/player/PlayerHelpView").navigationRow()]
    });
    return true;
};
