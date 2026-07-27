const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

module.exports = (continuityId) => {

    const modal =
        new ModalBuilder()

            .setCustomId(
                `v2_story_create_modal:${continuityId}`
            )

            .setTitle(
                "Nouvelle continuité"
            );

    const name =
        new TextInputBuilder()

            .setCustomId(
                "story_name"
            )

            .setLabel(
                "Nom de la nouvelle continuité"
            )

            .setPlaceholder(
                "Ex. Nouvelle ville, Univers alternatif"
            )

            .setRequired(true)

            .setStyle(
                TextInputStyle.Short
            )

            .setMaxLength(80);

    modal.addComponents(

        new ActionRowBuilder()

            .addComponents(name)

    );

    return modal;

};
