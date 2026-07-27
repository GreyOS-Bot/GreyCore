const guildCleanupManager =
    require(
        "../v2/managers/GuildCleanupV2Manager"
    );

const logger =
    require(
        "../v2/core/services/TechnicalLogger"
    ).create(
        "GuildDelete"
    );

module.exports = {
    name: "guildDelete",

    async execute(guild) {
        try {
            const result =
                guildCleanupManager
                    .cleanupDeletedGuild(
                        guild.id
                    );

            logger.info(
                "Nettoyage du serveur supprimé terminé.",
                result
            );
        } catch (error) {
            logger.error(
                "Impossible de nettoyer le serveur supprimé.",
                {
                    guildId: guild.id,
                    error: error.message
                }
            );
        }
    }
};
