const v2 =
    require(
        "../../index"
    );

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

const installationDetailView =
    require(
        "../../views/installation/InstallationDetailView"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "InstallationManagementHandler"
    );

async function open(
    interaction,
    installationId
) {
    const context =
        await getOwnedContext(
            interaction,
            installationId
        );

    if (!context) {
        return;
    }

    return interaction.update(
        installationDetailView
            .build(
                context
            )
    );
}

async function confirmDelete(
    interaction,
    installationId
) {
    const context =
        await getOwnedContext(
            interaction,
            installationId
        );

    if (!context) {
        return;
    }

    return interaction.update(
        installationDetailView
            .confirmDelete(
                context
            )
    );
}

async function deleteConfirmed(
    interaction,
    installationId
) {
    const context =
        await getOwnedContext(
            interaction,
            installationId
        );

    if (!context) {
        return;
    }

    const validationMessage =
        getValidationMessage(
            context.installation
        );

    try {
        v2.managers.installation
            .delete(
                context
                    .installation
                    .id
            );
    } catch (error) {
        logger.error(
            "Impossible de supprimer l’installation.",
            error
        );

        return replyError(
            interaction,
            error
        );
    }

    await closeValidationMessage(
        interaction,
        validationMessage
    );

    return interaction.update(
        installationDetailView
            .deleted(
                context
            )
    );
}

async function getOwnedContext(
    interaction,
    installationId
) {
    const numericInstallationId =
        Number(
            installationId
        );

    if (
        !Number.isInteger(
            numericInstallationId
        )
        ||
        numericInstallationId <= 0
    ) {
        await replyError(
            interaction,
            "Identifiant d’installation invalide."
        );

        return null;
    }

    const installation =
        v2.managers.installation
            .getById(
                numericInstallationId
            );

    if (!installation) {
        await replyError(
            interaction,
            "Installation introuvable."
        );

        return null;
    }

    const continuity =
        v2.managers.continuity
            .getById(
                installation
                    .continuity_id
            );

    const character =
        v2.managers.character
            .getById(
                installation
                    .character_id
            );

    if (
        !continuity
        || !character
    ) {
        await replyError(
            interaction,
            "Le personnage ou sa continuité est introuvable."
        );

        return null;
    }

    if (
        !characterManagementPolicy
            .isOwner(
                interaction,
                character
            )
    ) {
        await replyError(
            interaction,
            "Tu ne peux pas gérer cette installation."
        );

        return null;
    }

    return {
        installation,
        continuity,
        character,
        guildName:
            getGuildName(
                interaction,
                installation
                    .guild_id
            )
    };
}

function getGuildName(
    interaction,
    guildId
) {
    return (
        interaction
            .client
            ?.guilds
            ?.cache
            ?.get(
                String(
                    guildId
                )
            )
            ?.name
        || `Serveur ${guildId}`
    );
}

function getValidationMessage(
    installation
) {
    const storedMessage =
        v2.managers
            .installationMessage
            ?.getByInstallationId(
                installation.id
            )
        || null;

    return {
        channelId:
            installation
                .validation_channel_id
            || storedMessage
                ?.channel_id
            || null,
        messageId:
            installation
                .validation_message_id
            || storedMessage
                ?.message_id
            || null
    };
}

async function closeValidationMessage(
    interaction,
    validationMessage
) {
    const {
        channelId,
        messageId
    } = validationMessage;

    if (
        !channelId
        || !messageId
    ) {
        return;
    }

    try {
        const channel =
            await interaction
                .client
                .channels
                .fetch(
                    channelId
                );

        const message =
            await channel
                ?.messages
                ?.fetch(
                    messageId
                );

        if (message) {
            await message.edit({
                content:
                    "🗑️ Cette installation a été supprimée par son propriétaire.",
                embeds: [],
                components: []
            });
        }
    } catch (error) {
        logger.warn(
            "Impossible de fermer l’ancien message de validation.",
            error
        );
    }
}

module.exports = {
    open,
    confirmDelete,
    deleteConfirmed
};
