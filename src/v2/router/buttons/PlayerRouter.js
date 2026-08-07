const privacyView = require("../../views/privacy/PrivacyView");
const privacyService = require("../../services/privacy/UserPrivacyService");

module.exports = async interaction => {
    if (!interaction.isButton?.() || !interaction.customId?.startsWith("v2_player_")) return false;

    if (interaction.customId === "v2_player_help") {
        await interaction.update(require("../../views/player/PlayerHelpView").build());
        return true;
    }
    if (
        interaction.customId === "v2_player_directory"
        || interaction.customId.startsWith("v2_player_directory_page:")
    ) {
        const [, letter = "all", rawPage = "0"] = interaction.customId.split(":");
        const characters = require("../../managers/CharacterRosterV2Manager")
            .getRoster(interaction.guildId, { includeArchived: false });
        await interaction.update(
            require("../../views/player/PlayerDirectoryView").build(characters, {
                letter,
                page: Number(rawPage) || 0
            })
        );
        return true;
    }
    if (interaction.customId === "v2_player_privacy") {
        await interaction.update(require("../../views/player/PlayerPrivacyView").build());
        return true;
    }

    const navigation = require("../../views/player/PlayerHelpView").navigationRow();
    if (interaction.customId === "v2_player_privacy_policy") {
        await interaction.update({ ...privacyView.buildPolicy(), components: [navigation] });
        return true;
    }
    if (interaction.customId === "v2_player_privacy_charter") {
        await interaction.update({ ...privacyView.buildCharter(), components: [navigation] });
        return true;
    }
    if (interaction.customId === "v2_player_privacy_summary") {
        await interaction.update({
            ...privacyView.buildSummary(privacyService.getSummary(interaction.user.id)),
            components: [navigation]
        });
        return true;
    }
    if (interaction.customId === "v2_player_privacy_forget") {
        await interaction.update(
            require("../../views/player/PlayerPrivacyView").buildForgetConfirmation()
        );
        return true;
    }
    if (interaction.customId === "v2_player_privacy_forget_confirm") {
        const erased = privacyService.erase(interaction.user.id);
        await interaction.update({
            content: [
                "✅ **GreyCore t’a oublié(e).**",
                "Ton identifiant Discord a été remplacé par une référence anonyme.",
                "Tes personnages et leurs contenus RP sont conservés, mais ils ne sont plus reliés à ton compte Discord.",
                `Personnages conservés et anonymisés : **${erased.globalCharacters + erased.legacyCharacters}**.`
            ].join("\n"),
            embeds: [],
            components: []
        });
        return true;
    }
    return false;
};
