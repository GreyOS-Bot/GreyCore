const {
    ActionRowBuilder
} = require("discord.js");

const UI = require("../../framework");

const characterDashboardManager =
    require("../../services/dashboard/CharacterDashboardManager");

const guildModuleManager =
    require("../../managers/GuildModuleV2Manager");

const characterCategoryPage =
    require("./CharacterCategoryPage");

const characterManagementPolicy =
    require("../../core/policies/CharacterManagementPolicy");

class CharacterSocialCategoryPage {

    async execute(interaction, characterId) {
        const dashboardData =
            characterDashboardManager.getDashboardData(
                characterId,
                {
                    guildId: interaction.guildId
                }
            );

        if (!dashboardData) {
            return interaction.update({
                content: "❌ Ce personnage est introuvable.",
                embeds: [],
                components: []
            });
        }

        const countLabel = (label, count) =>
            Number(count || 0) > 0
                ? `${label} (${count})`
                : label;

        const isEnabled = moduleKey =>
            guildModuleManager.isEnabled(
                interaction.guildId,
                moduleKey
            );

        const buttons = [];

        if (isEnabled("relationships")) {
            buttons.push(
                UI.button.primary({
                    id: `page:character:relationships:${characterId}`,
                    label: countLabel(
                        "Relations",
                        dashboardData.counts.relations
                    ),
                    emoji: UI.icons.relations
                })
            );
        }

        if (isEnabled("encounters")) {
            buttons.push(
                UI.button.primary({
                    id: `page:character:encounters:${characterId}`,
                    label: countLabel(
                        "Rencontres",
                        dashboardData.counts.encounters
                    ),
                    emoji: UI.icons.encounters
                })
            );
        }

        if (
            isEnabled("phone")
            && characterManagementPolicy.isOwner(
                interaction,
                dashboardData.character
            )
        ) {
            buttons.push(
                UI.button.primary({
                    id: `v2_phone_open:${characterId}`,
                    label: "Téléphone",
                    emoji: UI.icons.phone
                })
            );
        }

        return interaction.update(
            characterCategoryPage.build({
                character: dashboardData.character,
                title: "❤️ Vie sociale",
                description: buttons.length
                    ? "Consultez les relations et les interactions du personnage."
                    : "Aucun module social n’est activé sur ce serveur.",
                rows: buttons.length
                    ? [
                        new ActionRowBuilder().addComponents(
                            ...buttons
                        )
                    ]
                    : []
            })
        );
    }
}

module.exports =
    new CharacterSocialCategoryPage();
