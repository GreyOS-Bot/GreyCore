const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

module.exports = {

    async show(
        interaction,
        characterId,
        mode = "sms"
    ) {

        const searchMode =
            [
                "call",
                "group"
            ].includes(mode)
                ? mode
                : "sms";

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `v2_phone_search_modal:${characterId}:${searchMode}`
                )
                .setTitle(
                    searchMode === "call"
                        ? "Lancer un appel"
                        : searchMode === "group"
                            ? "Ajouter un membre"
                            : "Rechercher un contact"
                );

        const input =
            new TextInputBuilder()
                .setCustomId("query")
                .setLabel("Nom ou numéro")
                .setPlaceholder(
                    searchMode === "group"
                        ? "Rechercher le personnage à ajouter"
                        : "Ex : Alba ou 555-1234"
                )
                .setRequired(true)
                .setStyle(
                    TextInputStyle.Short
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(input)
        );

        await interaction.showModal(
            modal
        );

    }

};
