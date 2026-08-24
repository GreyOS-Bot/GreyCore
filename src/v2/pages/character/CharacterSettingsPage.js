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

class CharacterSettingsPage {

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
                "❌ Tu ne peux pas modifier les paramètres de ce personnage."
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
                    "### ⚙️ Paramètres",
                    "Gérez les actions générales concernant ce personnage."
                ].join("\n\n")

            });

        embed.addFields(
            {
                name:
                    "Continuités",
                value:
                    String(
                        continuities.length
                    ),
                inline:
                    true
            },
            {
                name:
                    "Installations",
                value:
                    String(
                        installations.length
                    ),
                inline:
                    true
            },
            {
                name:
                    "Zone dangereuse",
                value:
                    "La suppression du personnage effacera toutes ses continuités et toutes leurs données."
            }
        );

        const actionRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.secondary({

                        id:
                            `v2_character_archive:${characterId}`,

                        label:
                            "Archiver le personnage",

                        emoji:
                            "📦"

                    }),

                    UI.button.danger({

                        id:
                            `page:character:delete:${characterId}`,

                        label:
                            "Supprimer le personnage",

                        emoji:
                            "🗑️"

                    })

                );

const typeRow = ["personnage_joue", "pj_masque"].includes(
            String(dashboardData.character.character_type)
        ) ? new ActionRowBuilder().addComponents(
            UI.button.secondary({
                id: `v2_character_toggle_masked:${characterId}`,
                label: dashboardData.character.character_type === "pj_masque"
                    ? "Afficher comme PJ"
                    : "Passer en PJ masqué",
                emoji: dashboardData.character.character_type === "pj_masque"
                    ? "👤"
                    : "🥷"
            })
        ) : null;

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.secondary({

                        id:
                            `page:character:home:${characterId}`,

                        label:
                            "Retour",

                        emoji:
                            "⬅️"

                    }),

                    UI.components.navigation.home(),
                    UI.components.navigation.library(),

                    UI.components.navigation
                        .close()

                );

        return interaction.update(

            UI.page.create({

                embed,
                components: [
                    actionRow,
                    ...(typeRow ? [typeRow] : []),
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
    new CharacterSettingsPage();
