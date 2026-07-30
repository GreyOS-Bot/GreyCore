const accessService =
    require(
        "./ProfileEditAccessService"
    );

const modalFactory =
    require(
        "./ProfileEditModalFactory"
    );

async function openIdentity(
    interaction,
    characterId
) {
    const dashboardData =
        await accessService
            .getEditableDashboard(
                interaction,
                characterId
            );

    if (!dashboardData) {
        return;
    }

    return interaction.showModal(
        modalFactory
            .createCreationIdentityModal(
                dashboardData.character,
                dashboardData.profile
                || {}
            )
    );
}

async function openInformation(
    interaction,
    characterId
) {
    const dashboardData =
        await accessService
            .getEditableDashboard(
                interaction,
                characterId
            );

    if (!dashboardData) {
        return;
    }

    return interaction.showModal(
        modalFactory
            .createInformationModal(
                characterId,
                dashboardData.profile
                || {}
            )
    );
}

async function openAlias(
    interaction,
    characterId
) {
    const dashboardData =
        await accessService
            .getEditableDashboard(
                interaction,
                characterId
            );

    if (!dashboardData) {
        return;
    }

    return interaction.showModal(
        modalFactory.createAliasModal(
            characterId,
            dashboardData.profile
            || {}
        )
    );
}

async function openStory(
    interaction,
    characterId
) {
    const dashboardData =
        await accessService
            .getEditableDashboard(
                interaction,
                characterId
            );

    if (!dashboardData) {
        return;
    }

    return interaction.showModal(
        modalFactory
            .createStoryModal(
                characterId,
                dashboardData.profile
                || {}
            )
    );
}

module.exports = {
    openIdentity,
    openAlias,
    openInformation,
    openStory
};
