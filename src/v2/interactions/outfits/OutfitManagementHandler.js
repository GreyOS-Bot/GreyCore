const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "OutfitManagementHandler"
    );

const {
    sanitizeError
} = require(
    "../../core/services/TechnicalErrorSanitizer"
);

const outfitManager =
    require(
        "../../managers/OutfitV2Manager"
    );

const continuityManager =
    require(
        "../../managers/ContinuityV2Manager"
    );

const characterOutfitPage =
    require(
        "../../pages/character/CharacterOutfitPage"
    );

const accessService =
    require("./OutfitAccessService");

const modalFactory =
    require("./OutfitModalFactory");

const viewFactory =
    require("./OutfitViewFactory");

const outfitImageStorage =
    require(
        "../../services/outfits/OutfitImageStorageService"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

async function openEditModal(
    interaction,
    outfitId
) {
    const context =
        await accessService
            .getOutfitContext(
                interaction,
                outfitId
            );

    if (!context) {
        return;
    }

    await interaction.showModal(
        modalFactory.createEditModal(
            context.outfit
        )
    );
}

async function saveEditModal(
    interaction,
    outfitId
) {
    const context =
        await accessService
            .getOutfitContext(
                interaction,
                outfitId
            );

    if (!context) {
        return;
    }

    const title =
        interaction.fields
            .getTextInputValue(
                "title"
            );

    const description =
        interaction.fields
            .getTextInputValue(
                "description"
            );

    try {
        outfitManager.updateDetails(
            outfitId,
            {
                title,
                description
            }
        );

        await replyPrivate(
            interaction,
            "✅ Les détails de la tenue ont été enregistrés."
        );
    } catch (error) {
        logger.error(
            "❌ Erreur modification tenue :",
            error
        );

        await replyError(
            interaction,
            error
        );
    }
}

async function saveAddModal(
    interaction,
    continuityId
) {
    const context =
        await accessService
            .getContinuityContext(
                interaction,
                continuityId
            );

    if (!context) {
        return;
    }

    const uploads =
        interaction.fields.getUploadedFiles(
            "image",
            true
        );

    const attachment =
        Array.from(
            uploads.values()
        )[0];

    if (!attachment) {
        return replyError(
            interaction,
            "Le fichier doit \u00eatre une image."
        );
    }

    const title =
        interaction.fields
            .getTextInputValue(
                "title"
            );

    const description =
        interaction.fields
            .getTextInputValue(
                "description"
            );

    try {
        const image =
            await outfitImageStorage.download(
                attachment
            );

        outfitManager.createCurrent({
            continuityId,
            imageUrl:
                attachment.url,
            imageData:
                image.data,
            imageFilename:
                image.filename,
            imageContentType:
                image.contentType,
            title,
            description
        });

        return replyPrivate(
            interaction,
            "✅ Tenue enregistrée et définie comme tenue actuelle."
        );
    } catch (error) {
        logger.error(
            "❌ Erreur création tenue :",
            error
        );

        return replyError(
            interaction,
            error
        );
    }
}

async function openChangeMenu(
    interaction,
    continuityId
) {
    const context =
        await accessService
            .getContinuityContext(
                interaction,
                continuityId
            );

    if (!context) {
        return;
    }

    const outfits =
        outfitManager.getForContinuity(
            continuityId,
            25
        );

    if (!outfits.length) {
        return replyError(
            interaction,
            "Aucune tenue n’est enregistrée."
        );
    }

    const availableOutfits =
        outfits.filter(
            outfit =>
                outfit.is_current !==
                1
        );

    if (!availableOutfits.length) {
        return replyPrivate(
            interaction,
            "ℹ️ Il n’existe aucune autre tenue à sélectionner."
        );
    }

    return replyPrivate(
        interaction,
        viewFactory.createChangeMenu(
            continuityId,
            availableOutfits
        )
    );
}

async function openManageMenu(
    interaction,
    continuityId
) {
    const context =
        await accessService
            .getContinuityContext(
                interaction,
                continuityId
            );

    if (!context) {
        return;
    }

    const outfits =
        outfitManager.getForContinuity(
            continuityId,
            25
        );

    if (!outfits.length) {
        return replyError(
            interaction,
            "Aucune tenue enregistrée."
        );
    }

    return replyPrivate(
        interaction,
        viewFactory.createManageMenu(
            continuityId,
            outfits
        )
    );
}

async function openManageView(
    interaction,
    outfitId
) {
    const context =
        await accessService
            .getOutfitContext(
                interaction,
                outfitId
            );

    if (!context) {
        return;
    }

    return interaction.update(
        viewFactory.createManageView(
            context.outfit
        )
    );
}

async function setCurrent(
    interaction,
    outfitId
) {
    const context =
        await accessService
            .getOutfitContext(
                interaction,
                outfitId
            );

    if (!context) {
        return;
    }

    outfitManager.setCurrent(
        outfitId
    );

    return characterOutfitPage.execute(
        interaction,
        context.continuity
            .character_id
    );
}

async function confirmDelete(
    interaction,
    outfitId
) {
    const context =
        await accessService
            .getOutfitContext(
                interaction,
                outfitId
            );

    if (!context) {
        return;
    }

    return interaction.update(
        viewFactory
            .createDeleteConfirmation(
                outfitId
            )
    );
}

async function deleteConfirmed(
    interaction,
    outfitId
) {
    const context =
        await accessService
            .getOutfitContext(
                interaction,
                outfitId
            );

    if (!context) {
        return;
    }

    try {
        const deletedOutfit =
            outfitManager.delete(
                outfitId
            );

        const continuity =
            continuityManager.getById(
                deletedOutfit
                    .continuity_id
            );

        if (!continuity) {
            return interaction.update({
                content:
                    "✅ Tenue supprimée.",
                embeds:
                    [],
                components:
                    []
            });
        }

        await characterOutfitPage
            .execute(
                interaction,
                continuity.character_id
            );

        return true;
    } catch (error) {
        logger.error(
            "❌ Erreur suppression tenue :",
            sanitizeError(error)
        );

        return interaction.update({
            content:
                "❌ Impossible de supprimer cette tenue.",
            embeds:
                [],
            components:
                []
        });
    }
}

module.exports = {
    openEditModal,
    saveAddModal,
    saveEditModal,
    openChangeMenu,
    openManageMenu,
    openManageView,
    setCurrent,
    confirmDelete,
    deleteConfirmed
};
