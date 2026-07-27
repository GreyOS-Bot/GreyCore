const accessService =
    require("./OutfitAccessService");

const modalFactory =
    require("./OutfitModalFactory");

async function openAddModal(
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

    return interaction.showModal(
        modalFactory.createAddModal(
            continuityId
        )
    );
}

module.exports = {
    openAddModal
};
