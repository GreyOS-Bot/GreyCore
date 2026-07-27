const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    LabelBuilder,
    FileUploadBuilder
} = require("discord.js");

function createAddModal(
    continuityId
) {
    const modal =
        new ModalBuilder()
            .setCustomId(
                `v2_outfit_add_modal:${continuityId}`
            )
            .setTitle(
                "Ajouter une tenue"
            );

    const image =
        new FileUploadBuilder()
            .setCustomId("image")
            .setMinValues(1)
            .setMaxValues(1)
            .setRequired(true);

    const title =
        new TextInputBuilder()
            .setCustomId("title")
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(false)
            .setMaxLength(100)
            .setPlaceholder(
                "Ex. Tenue de soirée"
            );

    const description =
        new TextInputBuilder()
            .setCustomId(
                "description"
            )
            .setStyle(
                TextInputStyle.Paragraph
            )
            .setRequired(false)
            .setMaxLength(1_500)
            .setPlaceholder(
                "Détails, accessoires, contexte…"
            );

    modal.addLabelComponents(
        new LabelBuilder()
            .setLabel(
                "Image de la tenue"
            )
            .setDescription(
                "Une image est nécessaire pour créer la tenue."
            )
            .setFileUploadComponent(
                image
            ),
        new LabelBuilder()
            .setLabel(
                "Nom de la tenue (facultatif)"
            )
            .setTextInputComponent(
                title
            ),
        new LabelBuilder()
            .setLabel(
                "Description (facultatif)"
            )
            .setTextInputComponent(
                description
            )
    );

    return modal;
}

function createEditModal(
    outfit
) {
    const modal =
        new ModalBuilder()
            .setCustomId(
                `v2_outfit_edit_modal:${outfit.id}`
            )
            .setTitle(
                "Modifier la tenue"
            );

    const title =
        new TextInputBuilder()
            .setCustomId("title")
            .setLabel("Titre (facultatif)")
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(false)
            .setValue(
                outfit.title || ""
            );

    const description =
        new TextInputBuilder()
            .setCustomId(
                "description"
            )
            .setLabel(
                "Description (facultatif)"
            )
            .setStyle(
                TextInputStyle.Paragraph
            )
            .setRequired(false)
            .setValue(
                outfit.description
                || ""
            );

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(
                title
            ),
        new ActionRowBuilder()
            .addComponents(
                description
            )
    );

    return modal;
}

module.exports = {
    createAddModal,
    createEditModal
};
