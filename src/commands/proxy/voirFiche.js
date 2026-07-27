const {
    ContextMenuCommandBuilder,
    ApplicationCommandType
} = require("discord.js");

const proxyMessageManager =
    require("../../managers/ProxyMessageManager");

const characterDashboardManager =
    require(
        "../../v2/services/dashboard/CharacterDashboardManager"
    );

const characterDashboardPage =
    require(
        "../../v2/pages/character/CharacterDashboardPage"
    );

const characterManagementPolicy =
    require(
        "../../v2/core/policies/CharacterManagementPolicy"
    );

const guildModuleManager =
    require(
        "../../v2/managers/GuildModuleV2Manager"
    );

module.exports = {

    data:
        new ContextMenuCommandBuilder()

            .setName("Voir la fiche")

            .setType(
                ApplicationCommandType.Message
            ),

    async execute(interaction) {

        try {

            const targetMessage =
                interaction.targetMessage;

            /*
             * 1. Retrouver le message proxy.
             */
            const proxyRecord =
                proxyMessageManager
                    .getByWebhookMessageId(
                        targetMessage.id
                    );

            if (!proxyRecord) {

                const dashboardData =
                    getDashboardFromExternalProxy(
                        interaction,
                        targetMessage
                    );

                if (dashboardData) {
                    const view =
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
                                    guildModuleManager
                                        .getConfiguration(
                                            interaction.guildId
                                        )
                            }
                        );

                    return interaction.reply({

                        ...view,

                        ephemeral:
                            true

                    });
                }

                return interaction.reply({

                    content:
                        "❌ Ce message n'appartient pas à Greycore.",

                    ephemeral:
                        true

                });

            }

            /*
             * 2. Charger les données complètes
             * du Dashboard V2 à partir du personnage V1.
             */
            const dashboardOptions = {
                guildId:
                    proxyRecord.guild_id
            };

            const dashboardData =
                proxyRecord.character_version
                    === "v2"
                    ? characterDashboardManager
                        .getDashboardData(
                            proxyRecord
                                .character_id,
                            dashboardOptions
                        )
                    : characterDashboardManager
                        .getDashboardDataFromLegacy(
                            proxyRecord
                                .character_id,
                            dashboardOptions
                        );

            if (!dashboardData) {

                return interaction.reply({

                    content:
                        "❌ Ce personnage n’a pas encore été relié à Greycore V2.",

                    ephemeral:
                        true

                });

            }

            /*
             * 3. Construire le Dashboard.
             */
            const view =
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
                            guildModuleManager
                                .getConfiguration(
                                    interaction.guildId
                                )
                    }
                );

            return interaction.reply({

                ...view,

                ephemeral:
                    true

            });

        } catch (error) {

            console.error(
                "❌ Erreur Voir la fiche :",
                error
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                return interaction.followUp({

                    content:
                        "❌ Une erreur est survenue pendant l’ouverture de la fiche.",

                    ephemeral:
                        true

                });

            }

            return interaction.reply({

                content:
                    "❌ Une erreur est survenue pendant l’ouverture de la fiche.",

                ephemeral:
                    true

            });

        }

    }

};

function getDashboardFromExternalProxy(
    interaction,
    targetMessage
) {
    const guildId =
        interaction.guildId
        || targetMessage.guild?.id
        || null;

    const proxyName =
        targetMessage.author?.username
        || targetMessage.member?.displayName
        || null;

    return characterDashboardManager
        .getPlayableDashboardByProxyName(
            guildId,
            proxyName
        );
}
