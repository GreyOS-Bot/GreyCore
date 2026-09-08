const assetManager =
    require("../../managers/AssetV2Manager");

const assetTypeManager =
    require("../../managers/AssetTypeV2Manager");

const dashboardManager =
    require("../../services/dashboard/CharacterDashboardManager");

const characterAssetsPage =
    require("../../pages/character/CharacterAssetsPage");

const accessService =
    require("./AssetAccessService");

const modalFactory =
    require("./AssetModalFactory");

const viewFactory =
    require("./AssetViewFactory");

const transferNotificationService =
    require(
        "../../services/assets/AssetTransferNotificationService"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

function getUploadedImageUrl(
    interaction
) {
    const uploads =
        interaction.fields.getUploadedFiles(
            "image",
            false
        );

    if (!uploads?.size) {
        return null;
    }

    const attachment =
        Array.from(
            uploads.values()
        )[0];

    if (
        !attachment
        || !attachment.contentType
            ?.startsWith("image/")
    ) {
        throw new Error(
            "Le fichier doit être une image."
        );
    }

    return attachment.url;
}

async function openTypePicker(interaction, characterId, installationId = null) {
    const context = await accessService.getCharacterContext(
        interaction,
        characterId,
        {
            requireManage: true
            ,installationId
        }
    );

    if (!context) {
        return;
    }

    const types = assetTypeManager.getForGuild(
        interaction.guildId
    );

    if (!types.length) {
        return replyError(
            interaction,
            "Aucun type de bien n’est disponible. Le staff doit d’abord les installer depuis la section Biens."
        );
    }

    return replyPrivate(
        interaction,
        viewFactory.typePicker(characterId, installationId, types)
    );
}

async function showCreateModal(interaction, characterId, typeId, installationId = null) {
    const context = await accessService.getCharacterContext(
        interaction,
        characterId,
        {
            requireManage: true
            ,installationId
        }
    );

    if (!context) {
        return;
    }

    const type = assetTypeManager.getById(typeId);

    if (
        !type
        || String(type.guild_id) !== String(interaction.guildId)
        || Number(type.is_archived) === 1
    ) {
        return replyError(
            interaction,
            "Ce type de bien n’est pas disponible."
        );
    }

    return interaction.showModal(
        modalFactory.createAssetModal(characterId, type, installationId)
    );
}

async function saveCreateModal(interaction, characterId, typeId, installationId = null) {
    const context = await accessService.getCharacterContext(
        interaction,
        characterId,
        {
            requireManage: true
            ,installationId
        }
    );

    if (!context) {
        return;
    }

    try {
        const asset = assetManager.create({
        guildId: interaction.guildId,
        contextId: context.installation.context_id,
        installationId: context.installation.id,
        continuityId: context.continuity.id,
        assetTypeId: typeId,
        name: interaction.fields.getTextInputValue("name"),
        description: interaction.fields.getTextInputValue("description"),
        details: interaction.fields.getTextInputValue("details"),
        imageUrl: getUploadedImageUrl(interaction),
        createdBy: interaction.user.id
        });

        return replyPrivate(
        interaction,
        `✅ **${asset.name}** a été ajouté aux biens de ${context.character.proxy_name}.`
        );
    } catch (error) {
        return replyError(
            interaction,
            error
        );
    }
}

async function openDetail(interaction, assetId, contextId = null) {
    const context = await accessService.getAssetContext(
        interaction,
        assetId,
        { contextId }
    );

    if (!context) {
        return;
    }

    return interaction.update(
        viewFactory.detail(
            context.asset,
            {
                canManage: context.canManage
            }
        )
    );
}

async function showEditModal(interaction, assetId, contextId = null) {
    const context = await accessService.getAssetContext(
        interaction,
        assetId,
        {
            requireManage: true,
            contextId
        }
    );

    if (!context) {
        return;
    }

    return interaction.showModal(
        modalFactory.editAssetModal(context.asset)
    );
}

async function saveEditModal(interaction, assetId, contextId = null) {
    const context = await accessService.getAssetContext(
        interaction,
        assetId,
        {
            requireManage: true,
            contextId
        }
    );

    if (!context) {
        return;
    }

    try {
        const imageUrl =
            getUploadedImageUrl(
                interaction
            );

        const changes = {
            name: interaction.fields.getTextInputValue("name"),
            description: interaction.fields.getTextInputValue("description"),
            details: interaction.fields.getTextInputValue("details")
        };

        if (imageUrl) {
            changes.imageUrl = imageUrl;
        }

        const asset = assetManager.update(
            assetId,
            changes,
            {
                guildId: interaction.guildId,
                contextId: context.asset.context_id
            }
        );

        return replyPrivate(
        interaction,
        `✅ Les détails de **${asset.name}** ont été enregistrés.`
        );
    } catch (error) {
        return replyError(
            interaction,
            error
        );
    }
}

async function showTransferModal(interaction, assetId, contextId = null) {
    const context = await accessService.getAssetContext(
        interaction,
        assetId,
        {
            requireManage: true,
            contextId
        }
    );

    if (!context) {
        return;
    }

    return interaction.showModal(
        modalFactory.transferSearchModal(
            context.asset.id,
            context.character.id,
            context.asset.context_id
        )
    );
}

async function showTransferHistory(interaction, assetId, contextId = null) {
    const context = await accessService.getAssetContext(
        interaction,
        assetId,
        {
            requireRead: true,
            contextId
        }
    );

    if (!context) {
        return;
    }

    return replyPrivate(
        interaction,
        viewFactory.transferHistory(
            context.asset,
            assetManager.getTransfers(
                assetId,
                {
                    guildId: interaction.guildId,
                    contextId: context.asset.context_id
                }
            )
        )
    );
}

async function findTransferCandidates(interaction, assetId, contextId = null) {
    const context = await accessService.getAssetContext(
        interaction,
        assetId,
        {
            requireManage: true,
            contextId
        }
    );

    if (!context) {
        return;
    }

    const query = interaction.fields
        .getTextInputValue("query")
        .trim();

    const candidates = dashboardManager
        .searchPlayableCharactersForGuild(
            interaction.guildId,
            query,
            {
                excludeCharacterId: context.character.id,
                contextId: context.asset.context_id
            }
        )
        .filter(candidate =>
            candidate.continuity.id !== context.continuity.id
        );

    if (!candidates.length) {
        return replyError(
            interaction,
            "Aucun autre personnage jouable ne correspond à cette recherche."
        );
    }

    return replyPrivate(
        interaction,
        viewFactory.transferCandidates(
            context.asset,
            candidates
        )
    );
}

async function transfer(interaction, assetId, targetInstallationId, contextId = null) {
    const context = await accessService.getAssetContext(
        interaction,
        assetId,
        {
            requireManage: true,
            contextId
        }
    );

    if (!context) {
        return;
    }

    const asset = assetManager.transfer(assetId, {
        guildId: interaction.guildId,
        contextId: context.asset.context_id,
        toInstallationId: targetInstallationId,
        expectedInstallationId: context.asset.installation_id,
        transferredBy: interaction.user.id
    });

    const notificationNeeded =
        transferNotificationService
            .shouldNotify({
                recipientId:
                    asset.owner_discord_user_id,
                senderId:
                    interaction.user.id
            });

    const notified =
        await transferNotificationService
            .notify({
                client:
                    interaction.client,
                recipientId:
                    asset.owner_discord_user_id,
                senderId:
                    interaction.user.id,
                senderCharacterName:
                    context.character.proxy_name,
                recipientCharacterName:
                    asset.owner_name,
                assetName:
                    asset.name,
                guildId:
                    interaction.guildId,
                channelId:
                    interaction.channelId
            });

    return replyPrivate(
        interaction,
        [
            `✅ **${asset.name}** a été transféré à **${asset.owner_name}**.`,
            notificationNeeded && !notified
                ? "⚠️ Le transfert est bien fait, mais GreyCore n’a pas pu prévenir son propriétaire par message privé."
                : null
        ]
            .filter(Boolean)
            .join("\n")
    );
}

async function showTypeManagement(interaction, characterId) {
    const context = await accessService.getCharacterContext(
        interaction,
        characterId,
        {}
    );

    if (
        !context
        || !accessService.canManageTypes(interaction)
    ) {
        if (context) {
            await replyError(
                interaction,
                "Seul le staff peut gérer les types de biens."
            );
        }

        return;
    }

    const types = assetTypeManager.ensureDefaults(
        interaction.guildId
    );

    return interaction.update(
        viewFactory.typeManagement(characterId, types)
    );
}

async function showTypeModal(interaction, characterId) {
    const context = await accessService.getCharacterContext(
        interaction,
        characterId,
        {}
    );

    if (
        !context
        || !accessService.canManageTypes(interaction)
    ) {
        if (context) {
            await replyError(
                interaction,
                "Seul le staff peut gérer les types de biens."
            );
        }

        return;
    }

    return interaction.showModal(
        modalFactory.assetTypeModal(characterId)
    );
}

async function saveTypeModal(interaction, characterId) {
    const context = await accessService.getCharacterContext(
        interaction,
        characterId,
        {}
    );

    if (
        !context
        || !accessService.canManageTypes(interaction)
    ) {
        if (context) {
            await replyError(
                interaction,
                "Seul le staff peut gérer les types de biens."
            );
        }

        return;
    }

    const type = assetTypeManager.create({
        guildId: interaction.guildId,
        label: interaction.fields.getTextInputValue("label"),
        emoji: interaction.fields.getTextInputValue("emoji")
    });

    return replyPrivate(
        interaction,
        `✅ Le type **${type.label}** est disponible pour ce serveur.`
    );
}

async function confirmDelete(interaction, assetId, contextId = null) {
    const context = await accessService.getAssetContext(
        interaction,
        assetId,
        {
            requireManage: true,
            contextId
        }
    );

    if (!context) {
        return;
    }

    return interaction.update(
        viewFactory.deleteConfirmation(context.asset)
    );
}

async function deleteConfirmed(interaction, assetId, contextId = null) {
    const context = await accessService.getAssetContext(
        interaction,
        assetId,
        {
            requireManage: true,
            contextId
        }
    );

    if (!context) {
        return;
    }

    assetManager.delete(assetId, {
        guildId: interaction.guildId,
        contextId: context.asset.context_id
    });

    return characterAssetsPage.execute(
        interaction,
        context.character.id
    );
}

module.exports = {
    openTypePicker,
    showCreateModal,
    saveCreateModal,
    openDetail,
    showEditModal,
    saveEditModal,
    showTransferModal,
    showTransferHistory,
    findTransferCandidates,
    transfer,
    showTypeManagement,
    showTypeModal,
    saveTypeModal,
    confirmDelete,
    deleteConfirmed
};
