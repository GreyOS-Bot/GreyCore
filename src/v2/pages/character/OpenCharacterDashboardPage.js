const characterDashboardManager =
    require("../../services/dashboard/CharacterDashboardManager");

const characterDashboardPage =
    require("./CharacterDashboardPage");

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

const guildModuleManager =
    require("../../managers/GuildModuleV2Manager");

const installationManager =
    require("../../managers/InstallationV2Manager");

const installationCreatedView =
    require("../../views/deployment/InstallationCreatedView");

const characterAvatarRequiredView =
    require("../../views/character/CharacterAvatarRequiredView");

class OpenCharacterDashboardPage {

    async execute(
        interaction,
        characterId
    ) {
        const [resolvedCharacterId, requestedInstallationId = null] = String(characterId).split("~");
        characterId = resolvedCharacterId;

        const dashboardData =
            characterDashboardManager.getDashboardData(
                characterId,
                {
                    guildId:
                        interaction.guildId,
                    installationId: requestedInstallationId
                }
            );

        if (!dashboardData) {

            return interaction.update({

                content:
                    "❌ Ce personnage est introuvable.",

                embeds:
                    [],

                components:
                    []

            });

        }

        const isOwner =
            characterManagementPolicy
                .isOwner(
                    interaction,
                    dashboardData.character
                );

        const installation = dashboardData.installation
            || (!requestedInstallationId && dashboardData.continuity && interaction.guildId
                ? installationManager.getByContinuityAndGuild(
                    dashboardData.continuity.id,
                    interaction.guildId
                )
                : null);

        if (
            installation
            && installation.status !== "approved"
        ) {
            if (!isOwner) {
                return interaction.update({
                    content:
                        "🔒 Ce personnage n’est pas encore validé sur ce serveur.",
                    embeds: [],
                    components: []
                });
            }

            const hasAvatar = Boolean(
                installation.local_avatar_url
                || dashboardData.character.avatar_url
            );

            const validationView = hasAvatar
                ? installationCreatedView.build(
                    dashboardData.character,
                    dashboardData.continuity,
                    installation,
                    interaction.guild,
                    { created: false }
                )
                : characterAvatarRequiredView.build(
                    dashboardData.character,
                    dashboardData.continuity,
                    installation,
                    interaction.guild
                );

            return interaction.update(
                validationView
            );
        }

        const page =
            characterDashboardPage.build(
                dashboardData.character,
                dashboardData.counts,
                {
                    isOwner,
                    installationId: installation?.id || null,
                    modules:
                        guildModuleManager.getConfiguration(
                            interaction.guildId
                        )
                }
            );

        return interaction.update(page);

    }

}

module.exports =
    new OpenCharacterDashboardPage();
