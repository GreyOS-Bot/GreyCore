const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

function createAddModal(characterId) {
    const alias =
        new TextInputBuilder()
            .setCustomId("alias")
            .setLabel("Alias \u00e0 taper")
            .setPlaceholder("Exemple : Al")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(32);

    return new ModalBuilder()
        .setCustomId(
            `v2_aliases_add_modal:${characterId}`
        )
        .setTitle("Ajouter un alias")
        .addComponents(
            new ActionRowBuilder()
                .addComponents(alias)
        );
}

module.exports = {
    createAddModal
};
