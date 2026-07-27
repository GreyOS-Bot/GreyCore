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

class CharacterInstallationPage {

    async execute(
        interaction,
        continuityId
    ) {

        const continuity =
            continuityManager.getById(
                continuityId
            );

        if (!continuity) {

            return interaction.update({

                content:
                    "❌ Cette continuité est introuvable.",

                embeds: [],
                components: []

            });

        }

        const dashboardData =
            characterDashboardManager.getDashboardData(
                continuity.character_id,
                {
                    continuityId:
                        continuity.id,
                    guildId:
                        interaction.guildId
                }
            );

        if (!dashboardData) {

            return interaction.update({

                content:
                    "❌ Ce personnage est introuvable.",

                embeds: [],
                components: []

            });

        }

        if (
            !characterManagementPolicy
                .isOwner(
                    interaction,
                    dashboardData
                        .character
                )
        ) {
            return interaction.update({
                content:
                    "❌ Tu ne peux pas consulter les installations de ce personnage.",
                embeds: [],
                components: []
            });
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
                    `### 📖 ${continuity.name}`
                ].join("\n\n")

            });

        embed.addFields(
            {
                name:
                    "Statut",
                value:
                    installations.length > 0
                        ? "✅ Installée"
                        : "❌ Non installée"
            },
            {
                name:
                    "Serveurs",
                value:
                    this.getGuildList(
                        interaction,
                        installations
                    )
            }
        );

        const actionRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.danger({

                        id:
                            `page:character:installation-delete:${continuity.id}`,

                        label:
                            "Supprimer cette continuité",

                        emoji:
                            "🗑️"

                    })

                );

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.secondary({

                        id:
                            `page:character:installations:${continuity.character_id}`,

                        label:
                            "Retour",

                        emoji:
                            "⬅️"

                    }),

                    UI.components.navigation
                        .close()

                );

        return interaction.update(

            UI.page.create({

                embed,
                components: [
                    actionRow,
                    navigationRow
                ]

            })

        );

    }

    getGuildList(
        interaction,
        installations
    ) {

        if (installations.length === 0) {
            return "Aucun serveur.";
        }

        return installations
            .map(installation => {

                const guild =
                    interaction.client
                        ?.guilds
                        ?.cache
                        ?.get(
                            String(
                                installation
                                    .guild_id
                            )
                        );

                return `• ${
                    guild?.name
                    || `Serveur ${installation.guild_id}`
                }`;

            })
            .join("\n");

    }

}

module.exports =
    new CharacterInstallationPage();
