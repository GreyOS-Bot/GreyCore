const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "requestInstallationValidation"
    );

const v2 =
    require("../../index");

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

const submissionService =
    require(
        "../../services/validation/ValidationSubmissionService"
    );

const submissionView =
    require(
        "../../views/validation/ValidationSubmissionView"
    );

module.exports = async interaction => {
    try {
        const installationId =
            interaction.customId
                .split(":")[1];

        if (!installationId) {
            return replyError(
                interaction,
                "Identifiant d’installation invalide."
            );
        }

        const installation =
            v2.managers.validation
                .getInstallation(
                    installationId
                );

        if (!installation) {
            return replyError(
                interaction,
                "Installation introuvable."
            );
        }

        /*
         * Fonctionne aussi depuis un message privé :
         * on récupère le serveur directement grâce
         * à l’installation.
         */
        if (
            interaction.guildId
            &&
            String(
                interaction.guildId
            )
            !==
            String(
                installation.guild_id
            )
        ) {
            return replyError(
                interaction,
                "Cette demande doit être envoyée depuis le serveur où l’installation a été créée."
            );
        }

        const guild =
            interaction.guild
            || await interaction.client.guilds
                .fetch(
                    installation.guild_id
                )
                .catch(() => null);

        if (!guild) {
            return replyError(
                interaction,
                "Greycore ne retrouve plus le serveur de cette installation."
            );
        }

        const continuity =
            v2.managers.continuity
                .getById(
                    installation.continuity_id
                );

        if (!continuity) {
            return replyError(
                interaction,
                "Histoire introuvable."
            );
        }

        const user =
            v2.managers.user
                .getOrCreate(
                    interaction.user.id
                );

        const character =
            v2.managers.library
                .getCharacterForUser(
                    continuity.character_id,
                    user.id
                );

        if (!character) {
            return replyError(
                interaction,
                "Tu ne peux pas envoyer cette installation en validation."
            );
        }

        const avatarUrl =
            installation.local_avatar_url
            || character.avatar_url;

        if (!avatarUrl) {
            const avatarResponse =
                submissionView
                    .avatarRequired(
                        character,
                        installation
                    );

            return replyError(
                interaction,
                avatarResponse.content,
                {
                    components:
                        avatarResponse
                            .components
                }
            );
        }

        const validationChannelId =
            v2.managers.guildSettings
                .getValidationChannelId(
                    guild.id
                );

        if (!validationChannelId) {
            return replyError(
                interaction,
                [
                    "❌ Aucun salon de validation n’a été configuré sur ce serveur.",
                    "",
                    "Un administrateur doit utiliser `/config validation`."
                ].join("\n")
            );
        }

        const validationChannel =
            await guild.channels
                .fetch(
                    validationChannelId
                )
                .catch(() => null);

        if (
            !validationChannel ||
            !validationChannel.isTextBased()
        ) {
            return replyError(
                interaction,
                "Le salon de validation configuré est introuvable ou inaccessible."
            );
        }

        const result =
            await submissionService
                .submit({
                    installation,
                    submittedBy:
                        interaction.user.id,
                    guild,
                    validationChannel
                });

        const response =
            submissionView
                .success({
                    character,
                    guild,
                    validationChannel,
                    installationId:
                        result
                            .submissionResult
                            .installation
                            .id
                });

        if (
            interaction.message &&
            interaction.isButton()
        ) {
            return interaction.update(
                response
            );
        }

        return replyPrivate(
            interaction,
            response
        );
    } catch (error) {
        logger.error(
            "❌ Erreur envoi validation V2 :",
            error
        );

        return replyError(
            interaction,
            error.message
            || "Impossible d’envoyer cette installation en validation."
        );
    }
};
