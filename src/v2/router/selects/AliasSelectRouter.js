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
    async function aliasSelectRouter(interaction) {
        if (
            !interaction.isStringSelectMenu()
            || !interaction.customId.startsWith(
                "v2_aliases_remove_select:"
            )
        ) {
            return false;
        }

        try {
            await aliasHandler.remove(
                interaction,
                interaction.customId
                    .split(":")[1]
            );
        } catch (error) {
            await replyError(
                interaction,
                error.message
                || "Impossible de supprimer cet alias."
            );
        }

        return true;
    };
