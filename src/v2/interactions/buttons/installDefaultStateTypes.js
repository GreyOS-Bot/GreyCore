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

const staffPermissionDecisionService =
    require(
        "../../core/services/StaffPermissionDecisionService"
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
            !staffPermissionDecisionService.decide({
                interaction,
                permission: "characters",
                write: true
            }).allowed
        ) {
            return replyError(
                interaction,
                "Cette action nécessite la permission `characters/write`."
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
