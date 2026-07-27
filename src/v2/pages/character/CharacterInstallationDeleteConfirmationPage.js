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

const installationManager =
    require(
        "../../managers/InstallationV2Manager"
    );

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

class CharacterInstallationDeleteConfirmationPage {

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
                "❌ Cette continuité est introuvable."
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

        if (!dashboardData) {

            return this.showError(
                interaction,
                "❌ Ce personnage est introuvable."
            );

        }

        if (
            !characterManagementPolicy.isOwner(
                interaction,
                dashboardData.character
            )
        ) {

            return this.showError(
                interaction,
                "❌ Tu ne peux pas supprimer les continuités de ce personnage."
            );

        }

        const installations =
            installationManager
                .getByContinuity(
                    continuity.id
                );

        const embed =
            UI.embed.create({

                title:
                    null,

                thumbnail:
                    dashboardData.character
                        .avatar_url
                    || null,

                description: [
                    UI.components
                        .characterHeader
                        .build(
                            dashboardData.character
                        ),
                    "### ⚠️ Suppression définitive",
                    `Vous allez supprimer la continuité **${continuity.name}**.`
                ].join("\n\n")

            });

        embed.addFields(
            {
                name:
                    "Cette action supprimera",
                value: [
                    `• ${this.getInstallationLabel(
                        installations.length
                    )}`,
                    "• le profil de cette continuité",
                    "• le téléphone, les SMS et les appels",
                    "• les relations et les rencontres",
                    "• les états et les tenues"
                ].join("\n")
            },
            {
                name:
                    "Important",
                value:
                    "Les autres continuités du personnage seront conservées. Cette action est irréversible."
            }
        );

        const confirmationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.danger({

                        id:
                            `page:character:installation-delete-confirmed:${continuity.id}`,

                        label:
                            "Supprimer définitivement",

                        emoji:
                            "🗑️"

                    }),

                    UI.button.secondary({

                        id:
                            `page:character:installation:${continuity.id}`,

                        label:
                            "Annuler",

                        emoji:
                            "✖️"

                    })

                );

        return interaction.update(

            UI.page.create({

                embed,
                components: [
                    confirmationRow
                ]

            })

        );

    }

    getInstallationLabel(count) {

        if (count === 0) {
            return "aucune installation serveur";
        }

        if (count === 1) {
            return "1 installation serveur";
        }

        return `${count} installations serveur`;

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
    new CharacterInstallationDeleteConfirmationPage();
