const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    LabelBuilder,
    FileUploadBuilder
} = require("discord.js");

function imageUploadLabel(
    description
) {
    const image = new FileUploadBuilder()
        .setCustomId("image")
        .setMinValues(0)
        .setMaxValues(1)
        .setRequired(false);

    return new LabelBuilder()
        .setLabel("Image du bien (facultatif)")
        .setDescription(description)
        .setFileUploadComponent(image);
}

function createAssetModal(characterId, type) {
    const modal = new ModalBuilder()
        .setCustomId(
            `v2_asset_create_modal:${characterId}:${type.id}`
        )
        .setTitle(`Ajouter : ${type.label}`);

    const name = new TextInputBuilder()
        .setCustomId("name")
        .setLabel("Nom du bien")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const description = new TextInputBuilder()
        .setCustomId("description")
        .setLabel("Description (facultatif)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1_500);

    const details = new TextInputBuilder()
        .setCustomId("details")
        .setLabel("Caractéristiques (facultatif)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1_500);

    modal.addComponents(
        new ActionRowBuilder().addComponents(name),
        new ActionRowBuilder().addComponents(description),
        new ActionRowBuilder().addComponents(details)
    );

    modal.addLabelComponents(
        imageUploadLabel(
            "Ajoute une image directement depuis ton appareil."
        )
    );

    return modal;
}

function editAssetModal(asset) {
    const modal = new ModalBuilder()
        .setCustomId(
            `v2_asset_edit_modal:${asset.id}:${asset.character_id}`
        )
        .setTitle("Modifier le bien");

    const name = new TextInputBuilder()
        .setCustomId("name")
        .setLabel("Nom du bien")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
        .setValue(asset.name || "");

    const description = new TextInputBuilder()
        .setCustomId("description")
        .setLabel("Description (facultatif)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1_500)
        .setValue(asset.description || "");

    const details = new TextInputBuilder()
        .setCustomId("details")
        .setLabel("Caractéristiques (facultatif)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1_500)
        .setValue(asset.details || "");

    modal.addComponents(
        new ActionRowBuilder().addComponents(name),
        new ActionRowBuilder().addComponents(description),
        new ActionRowBuilder().addComponents(details)
    );

    modal.addLabelComponents(
        imageUploadLabel(
            "Laisse vide pour conserver l’image actuelle."
        )
    );

    return modal;
}

function transferSearchModal(assetId, characterId) {
    const modal = new ModalBuilder()
        .setCustomId(
            `v2_asset_transfer_modal:${assetId}:${characterId}`
        )
        .setTitle("Offrir ou transférer un bien");

    const query = new TextInputBuilder()
        .setCustomId("query")
        .setLabel("Nom du personnage destinataire")
        .setPlaceholder("Ex. Alba")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    modal.addComponents(
        new ActionRowBuilder().addComponents(query)
    );

    return modal;
}

function assetTypeModal(characterId) {
    const modal = new ModalBuilder()
        .setCustomId(
            `v2_asset_type_modal:${characterId}`
        )
        .setTitle("Nouveau type de bien");

    const label = new TextInputBuilder()
        .setCustomId("label")
        .setLabel("Nom du type")
        .setPlaceholder("Ex. Arme, Objet précieux, Bateau")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(60);

    const emoji = new TextInputBuilder()
        .setCustomId("emoji")
        .setLabel("Emoji (facultatif)")
        .setPlaceholder("🎒")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(32);

    modal.addComponents(
        new ActionRowBuilder().addComponents(label),
        new ActionRowBuilder().addComponents(emoji)
    );

    return modal;
}

module.exports = {
    createAssetModal,
    editAssetModal,
    transferSearchModal,
    assetTypeModal
};
