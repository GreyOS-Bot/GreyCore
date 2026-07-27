const openLibrary =
    require(
        "../../interactions/buttons/openLibrary"
    );

const openLibraryHome =
    require(
        "../../interactions/buttons/openLibraryHome"
    );

const openContinuities =
    require(
        "../../interactions/buttons/openContinuities"
    );

const openContinuityInstallations =
    require(
        "../../interactions/buttons/openContinuityInstallations"
    );

const openGlobalCharacter =
    require(
        "../../interactions/buttons/openGlobalCharacter"
    );

const openStoryHome =
    require(
        "../../interactions/buttons/openStoryHome"
    );

const openStoryDeploy =
    require(
        "../../interactions/buttons/openStoryDeploy"
    );

const openContinueDeployment =
    require(
        "../../interactions/buttons/openContinueDeployment"
    );

const openCreateStoryModal =
    require(
        "../../interactions/buttons/openCreateStoryModal"
    );

const confirmDeployment =
    require(
        "../../interactions/buttons/confirmDeployment"
    );

const cancelStoryDeploy =
    require(
        "../../interactions/buttons/cancelStoryDeploy"
    );

const openDeploymentHelp =
    require(
        "../../interactions/buttons/openDeploymentHelp"
    );

const installationManagementHandler =
    require(
        "../../interactions/installations/InstallationManagementHandler"
    );

module.exports =
    async function libraryRouter(
        interaction
    ) {

        if (!interaction.isButton()) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId ===
            "v2_library_open"
        ) {
            await openLibrary(
                interaction
            );

            return true;
        }

        if (
            customId ===
            "v2_library_home"
        ) {
            await openLibraryHome(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_character_continuities:"
            )
            || customId.startsWith(
                "v2_character_deploy:"
            )
        ) {
            await openContinuities(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_continuity_installations:"
            )
        ) {
            await openContinuityInstallations(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_installation_open:"
            )
        ) {
            await installationManagementHandler
                .open(
                    interaction,
                    customId
                        .split(":")[1]
                );

            return true;
        }

        if (
            customId.startsWith(
                "v2_installation_delete_confirm:"
            )
        ) {
            await installationManagementHandler
                .deleteConfirmed(
                    interaction,
                    customId
                        .split(":")[1]
                );

            return true;
        }

        if (
            customId.startsWith(
                "v2_installation_delete:"
            )
        ) {
            await installationManagementHandler
                .confirmDelete(
                    interaction,
                    customId
                        .split(":")[1]
                );

            return true;
        }

        if (
            customId.startsWith(
                "v2_installation_create:"
            )
        ) {
            await openStoryDeploy(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_character_open:"
            )
        ) {
            await openGlobalCharacter(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_story_home:"
            )
            || customId.startsWith(
                "v2_continuity_open:"
            )
        ) {
            await openStoryHome(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_story_deploy:"
            )
        ) {
            await openStoryDeploy(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_deploy_help:"
            )
        ) {
            await openDeploymentHelp(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_deploy_continue:"
            )
        ) {
            await openContinueDeployment(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_deploy_new:"
            )
        ) {
            await openCreateStoryModal(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_deploy_confirm:"
            )
        ) {
            await confirmDeployment(
                interaction
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_deploy_cancel:"
            )
        ) {
            await cancelStoryDeploy(
                interaction
            );

            return true;
        }

        return false;

    };
