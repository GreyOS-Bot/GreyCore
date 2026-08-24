const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

const fastInteractionAcknowledgementService =
    require(
        "../../core/services/FastInteractionAcknowledgementService"
    );

module.exports =
    async function (
        interaction,
        dependencies
    ) {
        if (interaction.isButton() && interaction.customId.startsWith("v2_character_toggle_masked:")) {
            const characterId = interaction.customId.split(":")[1];
            const character = require("../../managers/CharacterV2Manager").getById(characterId);
            const policy = require("../../core/policies/CharacterManagementPolicy");
            if (!character || !policy.isOwner(interaction, character)) {
                await replyError(interaction, "Tu ne peux pas modifier le type de ce personnage.");
                return true;
            }
            if (!["personnage_joue", "pj_masque"].includes(character.character_type)) {
                await replyError(interaction, "Seul un PJ peut être affiché ou masqué.");
                return true;
            }
            require("../../services/character/CharacterTypeCorrectionService").correct({
                guildId: interaction.guildId,
                discordUserId: interaction.user.id,
                characterId,
                changes: {
                    characterType: character.character_type === "pj_masque"
                        ? "personnage_joue"
                        : "pj_masque"
                }
            });
            await require("../../pages/character/CharacterSettingsPage")
                .execute(interaction, characterId);
            return true;
        }

        if (
            interaction.isButton()
            && interaction.customId.startsWith("v2_character_archive:")
            && !interaction.customId.startsWith("v2_character_archive_confirm:")
        ) {
            const characterId = interaction.customId.split(":")[1];
            const v2 = require("../../index");
            const character = v2.managers.character.getById(characterId);
            const policy = require("../../core/policies/CharacterManagementPolicy");
            if (!character || !policy.isOwner(interaction, character)) {
                await replyError(interaction, "Tu ne peux pas archiver ce personnage.");
                return true;
            }
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setTitle("📦 Archiver ce personnage ?")
                    .setDescription(`**${character.proxy_name}** ne sera plus jouable ni visible dans l’annuaire. Toutes ses données seront conservées et tu pourras le restaurer depuis /greycore.`)],
                components: [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`v2_character_archive_confirm:${characterId}`).setLabel("Archiver").setEmoji("📦").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`page:character:settings:${characterId}`).setLabel("Annuler").setStyle(ButtonStyle.Secondary)
                )]
            });
            return true;
        }

        if (
            interaction.isButton()
            && interaction.customId.startsWith("v2_character_archive_confirm:")
        ) {
            const characterId = interaction.customId.split(":")[1];
            const v2 = require("../../index");
            const character = v2.managers.character.getById(characterId);
            const policy = require("../../core/policies/CharacterManagementPolicy");
            if (!character || !policy.isOwner(interaction, character)) {
                await replyError(interaction, "Tu ne peux pas archiver ce personnage.");
                return true;
            }
            v2.managers.character.setArchived(characterId, true);
            await interaction.update({
                content: `✅ **${character.proxy_name}** a été archivé sans supprimer ses données.`,
                embeds: [],
                components: []
            });
            return true;
        }

        if (
            interaction.isButton()
            && interaction.customId.startsWith(
                "v2_staff_character_identity:"
            )
        ) {
            await require(
                "../../interactions/staff/StaffCharacterCorrectionHandler"
            ).openIdentity(interaction);
            return true;
        }

        if (
            interaction.isButton()
            && interaction.customId.startsWith(
                "v2_staff_character_info:"
            )
        ) {
            await require(
                "../../interactions/staff/StaffCharacterCorrectionHandler"
            ).openInformation(interaction);
            return true;
        }

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
                    "v2_character_create_gender:"
                )
        ) {
            const [, type, selectedGender] = interaction.customId.split(":");
            const createCharacter = require(
                "../../interactions/modals/createCharacterV2"
            );
            await createCharacter.selectGender(interaction, type, selectedGender);
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

            await fastInteractionAcknowledgementService
                .deferComponentUpdate(
                    interaction
                );

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
                [
                    "🖼️ Envoie maintenant l’image du personnage dans ce salon. Tu disposes de 5 minutes.",
                    "",
                    "**Choisis le cadrage en écrivant avec l’image :**",
                    "`haut gauche`, `haut`, `haut droite`, `gauche`, `centre`, `droite`, `bas gauche`, `bas` ou `bas droite`.",
                    "Sans indication, GreyCore choisira automatiquement la zone importante."
                ].join("\n")
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

            await fastInteractionAcknowledgementService
                .deferComponentUpdate(
                    interaction
                );

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
                    "**Cadrage carré :** écris avec l’image `haut`, `centre`, `bas`, `gauche`, `droite` ou une combinaison comme `haut droite`.",
                    "Sans indication, GreyCore choisira automatiquement la zone importante.",
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
