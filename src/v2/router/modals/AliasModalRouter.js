const aliasHandler =
    require(
        "../../interactions/aliases/AliasInteractionHandler"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function aliasModalRouter(interaction) {
        if (
            !interaction.isModalSubmit()
            || !interaction.customId.startsWith(
                "v2_aliases_add_modal:"
            )
        ) {
            return false;
        }

        try {
            await aliasHandler.add(
                interaction,
                interaction.customId
                    .split(":")[1]
            );
        } catch (error) {
            await replyError(
                interaction,
                error.message
                || "Impossible d'ajouter cet alias."
            );
        }

        return true;
    };
