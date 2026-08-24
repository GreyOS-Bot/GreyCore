const selectContinuity =
    require(
        "../../interactions/selectMenus/selectContinuity"
    );

const selectLibraryCharacter =
    require(
        "../../interactions/selectMenus/selectLibraryCharacter"
    );

module.exports =
    async function librarySelectRouter(
        interaction
    ) {
        if (
            !interaction
                .isStringSelectMenu()
        ) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_continuity_select:"
            )
            || customId.startsWith(
                "v2_continuity_deploy_select:"
            )
        ) {
            await selectContinuity(
                interaction
            );

            return true;
        }

        if (customId === "v2_masked_parent_create_select") {
            const parentId = interaction.values[0];
            const manager = require("../../managers/CharacterV2Manager");
            const parent = manager.getById(parentId);
            if (!parent || parent.character_type !== "personnage_joue"
                || String(parent.discord_user_id) !== String(interaction.user.id)) {
                await require("../../core/services/InteractionResponseService").replyError(interaction, "Ce PJ principal est invalide.");
                return true;
            }
            require("../../managers/PendingActionManager").create({
                userId: interaction.user.id,
                type: "masked_parent_selection",
                guildId: interaction.guildId,
                maskedParentCharacterId: parent.id
            });
            await interaction.showModal(require("../../modals/CharacterCreateModal").build("pj_masque"));
            return true;
        }

        if (customId.startsWith("v2_masked_parent_link_select:")) {
            const [, maskedCharacterId, actorMode] = customId.split(":");
            const manager = require("../../managers/CharacterV2Manager");
            const masked = manager.getById(maskedCharacterId);
            const staff = actorMode === "staff";
            if (!masked || (!staff && String(masked.discord_user_id) !== String(interaction.user.id))) {
                await require("../../core/services/InteractionResponseService").replyError(interaction, "Tu ne peux pas modifier cette liaison.");
                return true;
            }
            if (staff && !require("../../core/policies/StaffPermissionPolicy").canManageCharacters(interaction)) {
                await require("../../core/services/InteractionResponseService").replyError(interaction, "Cette action est réservée au staff.");
                return true;
            }
            manager.setMaskedParent(maskedCharacterId, interaction.values[0]);
            if (staff) {
                const service = require("../../services/character/CharacterTypeCorrectionService");
                await interaction.update(require("../../views/character/StaffCharacterCorrectionView").build(
                    service.getForStaff({ guildId: interaction.guildId, characterId: maskedCharacterId })
                ));
            } else {
                await require("../../pages/character/CharacterSettingsPage").execute(interaction, maskedCharacterId);
            }
            return true;
        }
        if (
            customId ===
                "v2_library_character_select"
        ) {
            await selectLibraryCharacter(
                interaction
            );

            return true;
        }

        return false;
    };
