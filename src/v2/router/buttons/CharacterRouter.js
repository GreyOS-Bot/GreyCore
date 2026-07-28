const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function (
        interaction,
        dependencies
    ) {

        if (
            interaction.isButton()
            && interaction.customId ===
                "character_close"
        ) {

            const interfaceOwnerId =
                getInterfaceOwnerId(
                    interaction.message
                );

            if (
                interfaceOwnerId
                && String(interfaceOwnerId) !==
                    String(interaction.user?.id)
            ) {
                await replyError(
                    interaction,
                    "Cette interface appartient à un autre utilisateur."
                );

                return true;
            }

            await interaction.update({
                content:
                    "✅ Interface fermée.",
                embeds: [],
                components: []
            });

            return true;

        }

        if (
            interaction.isButton()
            && interaction.customId ===
                "v2_character_create"
        ) {

            const view =
                require(
                    "../../views/character/CharacterCreateTypeView"
                );

            await interaction.update(
                view.build()
            );

            return true;

        }

        if (
            interaction.isButton()
            && interaction.customId
                .startsWith(
                    "v2_character_create_type:"
                )
        ) {

            const type =
                interaction.customId
                    .split(":")[1];

            const modal =
                require(
                    "../../modals/CharacterCreateModal"
                );

            await interaction.showModal(
                modal.build(type)
            );

            return true;

        }

        if (
            interaction.isButton()
            && interaction.customId
                .startsWith(
                    "v2_character_create_details_open:"
                )
        ) {

            const type =
                interaction.customId
                    .split(":")[1];

            const createCharacter =
                require(
                    "../../interactions/modals/createCharacterV2"
                );

            await createCharacter.openDetails(
                interaction,
                type
            );

            return true;

        }

        if (
            interaction.isButton()
            && interaction.customId
                .startsWith(
                    "v2_character_avatar_request:"
                )
        ) {

            const [
                ,
                characterId,
                installationId
            ] = interaction.customId
                .split(":");

            const characterManager =
                require(
                    "../../managers/CharacterV2Manager"
                );

            const installationManager =
                require(
                    "../../managers/InstallationV2Manager"
                );

            const characterManagementPolicy =
                require(
                    "../../core/policies/CharacterManagementPolicy"
                );

            const pendingActionManager =
                require(
                    "../../managers/PendingActionManager"
                );

            const character =
                characterManager.getById(
                    characterId
                );

            const installation =
                installationManager.getById(
                    Number(
                        installationId
                    )
                );

            if (
                !character
                || !installation
                || installation.character_id !==
                    character.id
                || !characterManagementPolicy
                    .isOwner(
                        interaction,
                        character
                    )
            ) {

                await replyError(
                    interaction,
                    "Impossible de préparer l’envoi de cet avatar."
                );

                return true;

            }

            pendingActionManager.create({
                userId:
                    interaction.user.id,
                type:
                    "character_avatar_upload",
                guildId:
                    interaction.guildId,
                channelId:
                    interaction.channelId,
                characterId:
                    character.id,
                continuityId:
                    installation.continuity_id,
                installationId:
                    installation.id
            });

            await replyPrivate(
                interaction,
                "🖼️ Envoie maintenant l’image du personnage dans ce salon. Tu disposes de 5 minutes."
            );

            return true;

        }

        if (
            interaction.isButton()
            && interaction.customId
                .startsWith(
                    "v2_installation_avatar_request:"
                )
        ) {

            const [
                ,
                characterId,
                installationId
            ] = interaction.customId
                .split(":");

            const characterManager =
                require(
                    "../../managers/CharacterV2Manager"
                );

            const installationManager =
                require(
                    "../../managers/InstallationV2Manager"
                );

            const characterManagementPolicy =
                require(
                    "../../core/policies/CharacterManagementPolicy"
                );

            const pendingActionManager =
                require(
                    "../../managers/PendingActionManager"
                );

            const character =
                characterManager.getById(
                    characterId
                );

            const installation =
                installationManager.getById(
                    Number(
                        installationId
                    )
                );

            if (
                !character
                || !installation
                || installation.character_id !==
                    character.id
                || String(
                    installation.guild_id
                ) !==
                    String(
                        interaction.guildId
                    )
                || !characterManagementPolicy
                    .isOwner(
                        interaction,
                        character
                    )
            ) {

                await replyError(
                    interaction,
                    "Impossible de préparer l’avatar local de cette installation."
                );

                return true;

            }

            pendingActionManager.create({
                userId:
                    interaction.user.id,
                type:
                    "installation_avatar_upload",
                guildId:
                    installation.guild_id,
                channelId:
                    interaction.channelId,
                characterId:
                    character.id,
                continuityId:
                    installation.continuity_id,
                installationId:
                    installation.id
            });

            await replyPrivate(
                interaction,
                [
                    "🖼️ Envoie maintenant l’image à utiliser sur ce serveur.",
                    "",
                    "Ce changement sera propre à cette installation et ne modifiera pas les autres serveurs."
                ].join("\n")
            );

            return true;

        }

        return false;

    };

function getInterfaceOwnerId(
    message
) {
    return (
        message?.interactionMetadata?.user?.id
        || message?.interaction?.user?.id
        || null
    );
}
