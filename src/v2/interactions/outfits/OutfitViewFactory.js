const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

function createChangeMenu(
    continuityId,
    outfits
) {
    const selectMenu =
        new StringSelectMenuBuilder()
            .setCustomId(
                `v2_outfit_change_select:${continuityId}`
            )
            .setPlaceholder(
                "Choisir une ancienne tenue"
            )
            .addOptions(
                outfits.map(
                    (
                        outfit,
                        index
                    ) => ({
                        label:
                            outfit.title
                            || `Tenue ${index + 1}`,
                        description:
                            outfit.description
                                ? outfit
                                    .description
                                    .slice(
                                        0,
                                        100
                                    )
                                : "Aucune description",
                        value:
                            String(outfit.id),
                        emoji:
                            "👕"
                    })
                )
            );

    return {
        content:
            "👕 **Choisis la tenue à rendre active :**",
        components: [
            new ActionRowBuilder()
                .addComponents(
                    selectMenu
                )
        ]
    };
}

function createManageMenu(
    continuityId,
    outfits
) {
    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                `v2_outfit_manage_select:${continuityId}`
            )
            .setPlaceholder(
                "Sélectionner une tenue"
            )
            .addOptions(
                outfits.map(
                    (
                        outfit,
                        index
                    ) => ({
                        label:
                            outfit.title
                            || `Tenue ${index + 1}`,
                        description:
                            outfit.description
                                ? outfit
                                    .description
                                    .slice(
                                        0,
                                        100
                                    )
                                : "Aucune description",
                        value:
                            String(outfit.id),
                        emoji:
                            outfit.is_current
                                ? "⭐"
                                : "👕"
                    })
                )
            );

    return {
        content:
            "⚙️ **Gestion des tenues**",
        components: [
            new ActionRowBuilder()
                .addComponents(
                    menu
                )
        ]
    };
}

function createManageView(
    outfit
) {
    const embed =
        new EmbedBuilder()
            .setTitle(
                outfit.title
                || "Tenue"
            )
            .setDescription(
                outfit.description
                || "Aucune description."
            );

    if (outfit.image_url) {
        embed.setImage(
            outfit.image_url
        );
    }

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_outfit_setcurrent:${outfit.id}`
                    )
                    .setLabel(
                        "Définir actuelle"
                    )
                    .setEmoji("⭐")
                    .setStyle(
                        ButtonStyle.Success
                    )
                    .setDisabled(
                        outfit.is_current ===
                        1
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        `v2_outfit_edit:${outfit.id}`
                    )
                    .setLabel(
                        "Modifier"
                    )
                    .setEmoji("✏️")
                    .setStyle(
                        ButtonStyle.Primary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        `v2_outfit_delete:${outfit.id}`
                    )
                    .setLabel(
                        "Supprimer"
                    )
                    .setEmoji("🗑️")
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    return {
        embeds: [
            embed
        ],
        components: [
            row
        ]
    };
}

function createDeleteConfirmation(
    outfitId
) {
    const embed =
        new EmbedBuilder()
            .setTitle(
                "⚠ Supprimer cette tenue ?"
            )
            .setDescription(
                "Cette action est irréversible."
            );

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_outfit_delete_confirm:${outfitId}`
                    )
                    .setLabel(
                        "Supprimer"
                    )
                    .setEmoji("🗑️")
                    .setStyle(
                        ButtonStyle.Danger
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "v2_outfit_delete_cancel"
                    )
                    .setLabel(
                        "Annuler"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    return {
        embeds: [
            embed
        ],
        components: [
            row
        ]
    };
}

module.exports = {
    createChangeMenu,
    createManageMenu,
    createManageView,
    createDeleteConfirmation
};
