const accessService =
    require("./OutfitAccessService");

const modalFactory =
    require("./OutfitModalFactory");

async function openAddModal(
    interaction,
    installationId
) {
    const context =
        await accessService
            .getContinuityContext(
                interaction,
                installationId
            );

    if (!context) {
        return;
    }

    return interaction.showModal(
        modalFactory.createAddModal(
            installationId
        )
    );
}

module.exports = {
    openAddModal
};
