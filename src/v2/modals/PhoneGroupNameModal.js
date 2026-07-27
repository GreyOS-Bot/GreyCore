const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const groupDraftService =
    require(
        "../services/phone/PhoneGroupDraftService"
    );

const {
    replyError
} = require(
    "../core/services/InteractionResponseService"
);

module.exports = {

    async show(
        interaction,
        characterId
    ) {
        const draft =
            groupDraftService.get(
                interaction.user.id,
                characterId
            );

        if (!draft) {
            return replyError(
                interaction,
                "Commencez d’abord la création du groupe."
            );
        }

        const input =
            new TextInputBuilder()
                .setCustomId("name")
                .setLabel("Nom du groupe (facultatif)")
                .setPlaceholder("Ex : La bande du vendredi")
                .setMaxLength(100)
                .setRequired(false)
                .setStyle(TextInputStyle.Short);

        if (draft.name) {
            input.setValue(draft.name);
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    `v2_phone_group_name_modal:${characterId}`
                )
                .setTitle("Nom du groupe")
                .addComponents(
                    new ActionRowBuilder()
                        .addComponents(input)
                );

        return interaction.showModal(modal);
    }

};
