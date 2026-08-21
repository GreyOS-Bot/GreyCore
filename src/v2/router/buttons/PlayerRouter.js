const privacyView = require("../../views/privacy/PrivacyView");
const privacyService = require("../../services/privacy/UserPrivacyService");

module.exports = async interaction => {
    if (!interaction.isButton?.() || !interaction.customId?.startsWith("v2_player_")) return false;

    if (interaction.customId === "v2_player_help") {
        await interaction.update(require("../../views/player/PlayerHelpView").build());
        return true;
    }
    if (interaction.customId === "v2_player_activity") {
        const activity = require("../../services/player/PlayerActivityService")
            .getActivity(interaction.guildId, interaction.user.id);
        await interaction.update(
            require("../../views/player/PlayerActivityView").build(activity)
        );
        return true;
    }
    if (interaction.customId === "v2_player_archives") {
        const v2 = require("../../index");
        const user = v2.managers.user.getOrCreate(interaction.user.id);
        await interaction.update(
            require("../../views/player/PlayerArchivesView").build(
                v2.managers.library.getArchivedCharacters(user.id)
            )
        );
        return true;
    }
    if (interaction.customId.startsWith("v2_player_archive_restore:")) {
        const v2 = require("../../index");
        const characterId = interaction.customId.split(":")[1];
        const user = v2.managers.user.getOrCreate(interaction.user.id);
        const character = v2.managers.library.getCharacterForUser(characterId, user.id);
        if (!character || !character.is_archived) {
            await interaction.update({
                content: "❌ Ce personnage archivé est introuvable ou ne t’appartient pas.",
                embeds: [],
                components: []
            });
            return true;
        }
        v2.managers.character.setArchived(characterId, false);
        await interaction.update({
            content: `✅ **${character.proxy_name}** a été restauré et se trouve de nouveau dans ta bibliothèque.`,
            embeds: [],
            components: [require("../../views/player/PlayerHelpView").navigationRow()]
        });
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
    if (interaction.customId === "v2_player_scenes") {
        const sceneService = require("../../services/scenes/SceneAssistantService");
        const sceneManager = require("../../managers/SceneAssistantV2Manager");
        const status = sceneService.getStatus({
            guildId: interaction.guildId,
            channel: interaction.channel
        });
        await interaction.update(
            require("../../views/player/PlayerScenesView").build(
                status,
                sceneManager.getActiveScenes(interaction.guildId)
            )
        );
        return true;
    }
    if (interaction.customId === "v2_player_public_places"
        || interaction.customId.startsWith("v2_player_public_places_page:")) {
        const page = interaction.customId.startsWith("v2_player_public_places_page:")
            ? Number(interaction.customId.split(":")[1]) || 0
            : 0;
        const places = require("../../services/publicPlaces/PublicPlaceForumService")
            .getPublished(interaction.guildId);
        await interaction.update(
            require("../../views/player/PlayerPublicPlacesView").build(interaction.guildId, places, page)
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
