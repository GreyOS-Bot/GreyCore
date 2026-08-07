const privacyView = require("../../views/privacy/PrivacyView");
const privacyService = require("../../services/privacy/UserPrivacyService");

module.exports = async interaction => {
    if (!interaction.isButton?.() || !interaction.customId?.startsWith("v2_player_")) return false;

    if (interaction.customId === "v2_player_help") {
        await interaction.update(require("../../views/player/PlayerHelpView").build());
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
    return false;
};
