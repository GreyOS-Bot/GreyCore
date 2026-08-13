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
                "group",
                "email",
                "mms"
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
                            : searchMode === "email"
                                ? "Envoyer un e-mail"
                            : searchMode === "mms"
                                ? "Envoyer un MMS"
                            : "Rechercher un contact"
                );

        const input =
            new TextInputBuilder()
                .setCustomId("query")
                .setLabel("Nom ou numéro")
                .setPlaceholder(
                    searchMode === "group"
                        ? "Rechercher le personnage à ajouter"
                        : searchMode === "email"
                            ? "Ex : Alba, son alias ou son prénom"
                        : searchMode === "mms"
                            ? "Ex : Alba, son alias ou son prénom"
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
