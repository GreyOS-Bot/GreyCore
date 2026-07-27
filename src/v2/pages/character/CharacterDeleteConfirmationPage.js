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

class CharacterDeleteConfirmationPage {

    async execute(
        interaction,
        characterId
    ) {

        const dashboardData =
            characterDashboardManager
                .getDashboardData(
                    characterId,
                    {
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
                "❌ Tu ne peux pas supprimer ce personnage."
            );

        }

        const continuities =
            continuityManager.getByCharacter(
                characterId
            );

        const installations =
            installationManager.getByCharacter(
                characterId
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
                    "### ⚠️ Supprimer définitivement ce personnage ?",
                    `Vous êtes sur le point de supprimer **${dashboardData.character.proxy_name}** de votre bibliothèque.`
                ].join("\n\n")

            });

        embed.addFields(
            {
                name:
                    "Cette action supprimera",
                value: [
                    `• ${this.getCountLabel(
                        continuities.length,
                        "continuité",
                        "continuités"
                    )}`,
                    `• ${this.getCountLabel(
                        installations.length,
                        "installation serveur",
                        "installations serveur"
                    )}`,
                    "• tous les profils, téléphones, SMS et appels",
                    "• toutes les relations, rencontres, états et tenues"
                ].join("\n")
            },
            {
                name:
                    "Attention",
                value:
                    "Cette action est irréversible et concerne le personnage entier."
            }
        );

        const confirmationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.danger({

                        id:
                            `page:character:delete-confirmed:${characterId}`,

                        label:
                            "Supprimer définitivement",

                        emoji:
                            "🗑️"

                    }),

                    UI.button.secondary({

                        id:
                            `page:character:settings:${characterId}`,

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

    getCountLabel(
        count,
        singular,
        plural
    ) {

        return `${count} ${
            count === 1
                ? singular
                : plural
        }`;

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
    new CharacterDeleteConfirmationPage();
