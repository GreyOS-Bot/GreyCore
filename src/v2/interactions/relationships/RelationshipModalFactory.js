const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

function createSearchModal(
    characterId
) {
    const modal =
        new ModalBuilder()
            .setCustomId(
                `v2_relationship_search:${characterId}`
            )
            .setTitle(
                "Rechercher un personnage"
            );

    const searchInput =
        new TextInputBuilder()
            .setCustomId("query")
            .setLabel(
                "Nom du personnage"
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(100)
            .setPlaceholder(
                "Ex. Alba"
            );

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(
                searchInput
            )
    );

    return modal;
}

function createRelationshipModal({
    contextId
}) {
    const modal =
        new ModalBuilder()
            .setCustomId(
                `v2_rel_create:${contextId}`
            )
            .setTitle(
                "Ajouter la relation"
            );

    const noteInput =
        new TextInputBuilder()
            .setCustomId("note")
            .setLabel(
                "Description ou note (facultatif)"
            )
            .setStyle(
                TextInputStyle.Paragraph
            )
            .setRequired(false)
            .setMaxLength(1000)
            .setPlaceholder(
                "Contexte de la relation…"
            );

    const dateInput =
        new TextInputBuilder()
            .setCustomId("started_at")
            .setLabel(
                "Date de début (facultatif)"
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(false)
            .setMaxLength(10)
            .setPlaceholder(
                "AAAA-MM-JJ"
            );

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(
                noteInput
            ),
        new ActionRowBuilder()
            .addComponents(
                dateInput
            )
    );

    return modal;
}

function createEditModal({
    characterId,
    relationshipId,
    relationship
}) {
    const modal =
        new ModalBuilder()
            .setCustomId(
                `v2_relationship_edit_submit:${characterId}:${relationshipId}`
            )
            .setTitle(
                "Modifier les détails de la relation"
            );

    const noteInput =
        new TextInputBuilder()
            .setCustomId("note")
            .setLabel(
                "Description ou note (facultatif)"
            )
            .setStyle(
                TextInputStyle.Paragraph
            )
            .setRequired(false)
            .setMaxLength(1000)
            .setValue(
                String(
                    relationship.note
                    || ""
                ).slice(0, 1000)
            );

    const dateInput =
        new TextInputBuilder()
            .setCustomId("started_at")
            .setLabel(
                "Date de début (facultatif)"
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(false)
            .setMaxLength(10)
            .setPlaceholder(
                "AAAA-MM-JJ"
            )
            .setValue(
                relationship.started_at
                    ? String(
                        relationship.started_at
                    ).slice(0, 10)
                    : ""
            );

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(
                noteInput
            ),
        new ActionRowBuilder()
            .addComponents(
                dateInput
            )
    );

    return modal;
}

module.exports = {
    createSearchModal,
    createRelationshipModal,
    createEditModal
};
