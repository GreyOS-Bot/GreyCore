const {
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const UI = require("../../framework");

const dashboardManager =
    require("../../services/dashboard/CharacterDashboardManager");

const assetManager =
    require("../../managers/AssetV2Manager");

const assetAccessService =
    require("../../interactions/assets/AssetAccessService");

const guildModuleManager =
    require("../../managers/GuildModuleV2Manager");

class CharacterAssetsPage {

    build({
        dashboardData,
        assets,
        canManage,
        canManageTypes
    }) {
        const {
            character,
            continuity
        } = dashboardData;

        const assetLines = assets.length
            ? assets.slice(0, 10).map(asset => [
                `${asset.type_emoji || "🎒"} **${asset.name}** · ${asset.type_label}`,
                asset.description
                    ? `-# ${asset.description.slice(0, 100)}`
                    : null
            ]
                .filter(Boolean)
                .join("\n")
            ).join("\n\n")
            : "Aucun bien pour le moment.";

        const embed = UI.embed.create({
            title: null,
            thumbnail: character.avatar_url || null,
            description: UI.text.blocks([
                UI.components.characterHeader.build(character),
                "### 🎒 Biens",
                `Les biens de cette continuité : **${continuity.name}**.`,
                assetLines,
                assets.length > 10
                    ? `-# ${assets.length - 10} autre(s) bien(s) non affiché(s).`
                    : null
            ])
        });

        const navigation = new ActionRowBuilder()
            .addComponents(
                UI.button.secondary({
                    id: `page:character:home:${character.id}`,
                    label: "Retour",
                    emoji: "⬅️"
                }),
                UI.components.navigation.home(),
                UI.components.navigation.library(),
                UI.components.navigation.close()
            );

        const components = [];

        if (canManage) {
            const managementButtons = [
                UI.button.success({
                    id: `v2_asset_add:${character.id}`,
                    label: "Ajouter un bien",
                    emoji: "➕"
                })
            ];

            if (canManageTypes) {
                managementButtons.push(
                    UI.button.secondary({
                        id: `v2_asset_types:${character.id}`,
                        label: "Types de biens",
                        emoji: "⚙️"
                    })
                );
            }

            components.push(
                new ActionRowBuilder().addComponents(
                    ...managementButtons
                )
            );
        }

        if (assets.length) {
            components.push(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(
                            `v2_asset_select:${character.id}`
                        )
                        .setPlaceholder("Consulter un bien")
                        .addOptions(
                            assets.slice(0, 25).map(asset => ({
                                label: String(asset.name).slice(0, 100),
                                description: String(
                                    asset.type_label
                                ).slice(0, 100),
                                value: String(asset.id),
                                emoji: asset.type_emoji || "🎒"
                            }))
                        )
                )
            );
        }

        components.push(navigation);

        return UI.page.create({
            embed,
            components
        });
    }

    async execute(interaction, characterId) {
        if (
            !guildModuleManager.isEnabled(
                interaction.guildId,
                "assets"
            )
        ) {
            return interaction.update({
                content: "ℹ️ Le module Biens est désactivé sur ce serveur.",
                embeds: [],
                components: []
            });
        }

        const dashboardData =
            dashboardManager.getPlayableDashboardData(
                characterId,
                {
                    guildId: interaction.guildId
                }
            );

        if (!dashboardData?.continuity) {
            return interaction.update({
                content: "❌ Ce personnage n’est pas jouable sur ce serveur.",
                embeds: [],
                components: []
            });
        }

        const assets = assetManager.getForContinuity(
            interaction.guildId,
            dashboardData.continuity.id
        );

        return interaction.update(
            this.build({
                dashboardData,
                assets,
                canManage: assetAccessService.canManage(
                    interaction,
                    dashboardData.character
                ),
                canManageTypes:
                    assetAccessService.canManageTypes(
                        interaction
                    )
            })
        );
    }
}

module.exports =
    new CharacterAssetsPage();
