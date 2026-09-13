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
        const rosterManager = require("../../managers/CharacterRosterV2Manager");
        const characters = typeof rosterManager.getRosterByContext === "function"
            ? rosterManager.getRosterByContext(interaction.guildId, null, { includeArchived: false })
            : rosterManager.getRoster(interaction.guildId, { includeArchived: false });
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
        const sceneContextId = status.scene?.context_id
            || status.cycle?.context_id
            || (typeof sceneManager.resolveContext === "function"
                ? sceneManager.resolveContext(interaction.guildId, null).id
                : null);
        await interaction.update(
            require("../../views/player/PlayerScenesView").build(
                status,
                sceneContextId
                    ? sceneManager.getActiveScenes(interaction.guildId, sceneContextId)
                    : sceneManager.getActiveScenes(interaction.guildId)
            )
        );
        return true;
    }
    if (interaction.customId === "v2_player_public_places"
        || interaction.customId.startsWith("v2_player_public_places_page:")) {
        if(interaction.customId==="v2_player_public_places"){
            const {ActionRowBuilder,StringSelectMenuBuilder}=require("discord.js");
            const ContextRepository=require("../../repositories/ContextRepository"),list=new ContextRepository().listByGuild(interaction.guildId);
            await interaction.update({content:"Choisis le Context dont tu veux consulter les lieux publics.",embeds:[],components:[new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("v2_player_public_places_context").setPlaceholder("Choisir un Context").addOptions(list.slice(0,25).map(c=>({label:c.name,value:c.id,emoji:c.is_active?"🌍":"⏸️"}))))]});return true;
        }
        const [,contextId,rawPage]=interaction.customId.split(":");
        const page=Number(rawPage)||0;
        const places = require("../../services/publicPlaces/PublicPlaceForumService")
            .getPublished(interaction.guildId,contextId);
        await interaction.update(
            require("../../views/player/PlayerPublicPlacesView").build(interaction.guildId,contextId, places, page)
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
