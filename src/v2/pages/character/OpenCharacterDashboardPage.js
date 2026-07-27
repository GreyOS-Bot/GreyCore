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

class OpenCharacterDashboardPage {

    async execute(
        interaction,
        characterId
    ) {

        const dashboardData =
            characterDashboardManager.getDashboardData(
                characterId,
                {
                    guildId:
                        interaction.guildId
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

        const page =
            characterDashboardPage.build(
                dashboardData.character,
                dashboardData.counts,
                {
                    isOwner:
                        characterManagementPolicy
                            .isOwner(
                                interaction,
                                dashboardData.character
                            ),
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
