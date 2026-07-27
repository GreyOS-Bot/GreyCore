const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "installDefaultStateTypes"
    );

const stateManager =
    require(
        "../../managers/StateTypeV2Manager"
    );

const guildManagementPolicy =
    require(
        "../../core/policies/GuildManagementPolicy"
    );

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function installDefaultStateTypes(
        interaction
    ) {
        if (
            !guildManagementPolicy
                .canManage(
                    interaction
                )
        ) {
            return replyError(
                interaction,
                "Vous devez pouvoir gérer le serveur pour installer les états par défaut."
            );
        }

        try {
            const before =
                stateManager
                    .getStateTypesByGuild(
                        interaction.guildId
                    )
                    .length;

            const stateTypes =
                stateManager
                    .installDefaultStateTypes(
                        interaction.guildId,
                        interaction.user.id
                    );

            const added =
                Math.max(
                    0,
                    stateTypes.length
                    - before
                );

            return replyPrivate(
                interaction,
                added > 0
                    ? `✅ ${added} type(s) d’état ont été installés.`
                    : "✅ Tous les types d’état par défaut étaient déjà installés."
            );
        } catch (error) {
            logger.error(
                "❌ Installation états par défaut :",
                error
            );

            return replyError(
                interaction,
                "Impossible d’installer les états par défaut."
            );
        }
    };
