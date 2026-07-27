const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const continuityManager =
    require(
        "../../managers/ContinuityV2Manager"
    );

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

class CharacterInstallationDeletePage {

    async execute(
        interaction,
        continuityId
    ) {

        const continuity =
            continuityManager.getById(
                continuityId
            );

        if (!continuity) {

            return this.showError(
                interaction,
                "❌ Cette continuité a déjà été supprimée ou n’existe plus."
            );

        }

        const dashboardData =
            characterDashboardManager
                .getDashboardData(
                    continuity.character_id,
                    {
                        continuityId:
                            continuity.id,
                        guildId:
                            interaction.guildId
                    }
                );

        if (
            !dashboardData
            || !characterManagementPolicy.isOwner(
                interaction,
                dashboardData.character
            )
        ) {

            return this.showError(
                interaction,
                "❌ Tu ne peux pas supprimer cette continuité."
            );

        }

        const characterId =
            continuity.character_id;

        const result =
            continuityManager.delete(
                continuity.id
            );

        const embed =
            UI.embed.create({

                title:
                    "✅ Continuité supprimée",

                thumbnail:
                    dashboardData.character
                        .avatar_url
                    || null,

                description:
                    `La continuité **${result.continuity.name}** et toutes ses données ont été supprimées définitivement.`

            });

        embed.addFields({

            name:
                "Installations supprimées",

            value:
                String(
                    result.installationCount
                )

        });

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.primary({

                        id:
                            `page:character:installations:${characterId}`,

                        label:
                            "Voir les continuités restantes",

                        emoji:
                            "📚"

                    }),

                    UI.components.navigation
                        .close()

                );

        return interaction.update(

            UI.page.create({

                embed,
                components: [
                    navigationRow
                ]

            })

        );

    }

    showError(
        interaction,
        content
    ) {

        return interaction.update({

            content,
            embeds: [],
            components: []

        });

    }

}

module.exports =
    new CharacterInstallationDeletePage();
