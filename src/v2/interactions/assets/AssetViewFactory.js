const {
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const UI = require("../../framework");

function typePicker(characterId, types) {
    return {
        content: "Choisis le type du bien à ajouter.",
        components: [
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(
                        `v2_asset_create_type:${characterId}`
                    )
                    .setPlaceholder("Type de bien")
                    .addOptions(
                        types.slice(0, 25).map(type => ({
                            label: type.label.slice(0, 100),
                            value: String(type.id),
                            emoji: type.emoji || "🎒"
                        }))
                    )
            )
        ]
    };
}

function detail(asset, { canManage = false } = {}) {
    const description = [
        `### ${asset.type_emoji || "🎒"} ${asset.name}`,
        `**Type** · ${asset.type_label}`,
        `**Propriétaire** · ${asset.owner_name}`,
        asset.description
            ? `\n${asset.description}`
            : null,
        asset.details
            ? `\n**Caractéristiques**\n${asset.details}`
            : null
    ]
        .filter(Boolean)
        .join("\n");

    const embed = UI.embed.create({
        title: null,
        description
    });

    if (asset.image_url) {
        embed.setImage(asset.image_url);
    }

    const navigation = new ActionRowBuilder()
        .addComponents(
            UI.button.secondary({
                id: `page:character:assets:${asset.character_id}`,
                label: "Retour",
                emoji: "⬅️"
            }),
            UI.components.navigation.close()
        );

    const components = canManage
        ? [
            new ActionRowBuilder().addComponents(
                UI.button.primary({
                    id: `v2_asset_edit:${asset.id}:${asset.character_id}`,
                    label: "Modifier",
                    emoji: "✏️"
                }),
                UI.button.primary({
                    id: `v2_asset_transfer:${asset.id}:${asset.character_id}`,
                    label: "Offrir / transférer",
                    emoji: "🎁"
                }),
                UI.button.secondary({
                    id: `v2_asset_history:${asset.id}:${asset.character_id}`,
                    label: "Historique",
                    emoji: "📚"
                }),
                UI.button.danger({
                    id: `v2_asset_delete:${asset.id}:${asset.character_id}`,
                    label: "Supprimer",
                    emoji: "🗑️"
                })
            ),
            navigation
        ]
        : [navigation];

    return UI.page.create({
        embed,
        components
    });
}

function transferHistory(asset, transfers) {
    const description = transfers.length
        ? transfers.map(formatTransfer).join("\n\n")
        : "Ce bien n’a pas encore été transféré.";

    return UI.page.create({
        embed: UI.embed.create({
            title: `📚 Historique · ${asset.name}`,
            description: truncate(description, 4_000)
        })
    });
}

function formatTransfer(transfer) {
    const fromName = transfer.from_character_name
        || "Personnage inconnu";

    const toName = transfer.to_character_name
        || "Personnage inconnu";

    const lines = [
        `🎁 **${fromName}** → **${toName}**`,
        `Par ${formatActor(transfer.transferred_by)} · ${formatDate(transfer.created_at)}`
    ];

    if (transfer.note) {
        lines.push(
            `> ${truncate(transfer.note, 300)}`
        );
    }

    return lines.join("\n");
}

function formatActor(actorId) {
    const value = String(actorId || "").trim();

    return /^\d{16,20}$/.test(value)
        ? `<@${value}>`
        : value || "GreyCore";
}

function formatDate(value) {
    const timestamp = Date.parse(value);

    if (!Number.isFinite(timestamp)) {
        return "date inconnue";
    }

    return `<t:${Math.floor(timestamp / 1_000)}:f>`;
}

function truncate(value, maximumLength) {
    const text = String(value || "").trim();

    if (text.length <= maximumLength) {
        return text;
    }

    return `${text.slice(0, maximumLength - 1)}…`;
}

function typeManagement(characterId, types) {
    const embed = UI.embed.create({
        title: "🎒 Types de biens",
        description: types.length
            ? types.map(type =>
                `${type.emoji || "🎒"} **${type.label}**`
            ).join("\n")
            : "Aucun type n’est configuré."
    });

    return UI.page.create({
        embed,
        components: [
            new ActionRowBuilder().addComponents(
                UI.button.success({
                    id: `v2_asset_type_add:${characterId}`,
                    label: "Ajouter un type",
                    emoji: "➕"
                }),
                UI.button.secondary({
                    id: `page:character:assets:${characterId}`,
                    label: "Retour",
                    emoji: "⬅️"
                }),
                UI.components.navigation.close()
            )
        ]
    });
}

function transferCandidates(asset, candidates) {
    return {
        content: `Choisis le personnage qui reçoit **${asset.name}**.`,
        components: [
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(
                        `v2_asset_transfer_select:${asset.id}:${asset.character_id}`
                    )
                    .setPlaceholder("Personnage destinataire")
                    .addOptions(
                        candidates.slice(0, 25).map(candidate => ({
                            label: String(
                                candidate.character.proxy_name
                            ).slice(0, 100),
                            description: String(
                                candidate.continuity.name
                                || "Continuité active"
                            ).slice(0, 100),
                            value: String(candidate.continuity.id)
                        }))
                    )
            )
        ]
    };
}

function deleteConfirmation(asset) {
    return UI.page.create({
        embed: UI.embed.create({
            title: "Supprimer ce bien ?",
            description: [
                `Le bien **${asset.name}** sera supprimé définitivement.`,
                "Cette action ne peut pas être annulée."
            ].join("\n\n")
        }),
        components: [
            new ActionRowBuilder().addComponents(
                UI.button.danger({
                    id: `v2_asset_delete_confirm:${asset.id}:${asset.character_id}`,
                    label: "Supprimer définitivement",
                    emoji: "🗑️"
                }),
                UI.button.secondary({
                    id: `v2_asset_open:${asset.id}`,
                    label: "Annuler",
                    emoji: "⬅️"
                })
            )
        ]
    });
}

module.exports = {
    typePicker,
    detail,
    transferHistory,
    typeManagement,
    transferCandidates,
    deleteConfirmation
};
