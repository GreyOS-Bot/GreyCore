const page = require("../../pages/staff/StaffPermissionsPage");
const policy = require("../../core/policies/StaffPermissionPolicy");
const manager = require("../../managers/StaffPermissionV2Manager");
const { replyError } = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    if (interaction.customId === "v2_staff_characters_cancel_installation_select") {
        if (!policy.canManageCharacters(interaction)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
        await interaction.showModal(new ModalBuilder()
            .setCustomId(`v2_staff_characters_cancel_installation_submit:${interaction.values[0]}`)
            .setTitle("Annuler l’installation")
            .addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("reason")
                    .setLabel("Motif conservé dans l’historique")
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(500)
                    .setRequired(true)
            )));
        return true;
    }
    if (["v2_staff_scenes_remove_zone", "v2_staff_scenes_remove_expression"].includes(interaction.customId)) {
        if (!policy.canAccess(interaction, "scenes", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const sceneManager = require("../../managers/SceneAssistantV2Manager");
        if (interaction.customId === "v2_staff_scenes_remove_zone") {
            sceneManager.removeScope(interaction.guildId, interaction.values[0]);
        } else {
            sceneManager.removeTriggerExpression(interaction.guildId, interaction.values[0]);
        }
        await interaction.update(require("../../pages/staff/StaffScenesPage").buildManagement(interaction));
        return true;
    }
    if (interaction.customId?.startsWith("v2_staff_universe_delete_state:")) {
        if (!policy.canAccess(interaction, "universe", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const pageNumber = Number(interaction.customId.split(":")[1]);
        const stateManager = require("../../managers/StateTypeV2Manager");
        const typeId = Number(interaction.values[0]);
        const usages = stateManager.countStatesUsingType(interaction.guildId, typeId);
        if (usages > 0) {
            await replyError(interaction, `Cet état est encore utilisé ${usages} fois et ne peut pas être supprimé.`);
            return true;
        }
        try {
            stateManager.deleteStateType(interaction.guildId, typeId);
        } catch (error) {
            await replyError(interaction, error);
            return true;
        }
        await interaction.update(require("../../pages/staff/StaffUniversePage")
            .buildStateManagement(interaction, pageNumber));
        return true;
    }
    if (interaction.customId?.startsWith("v2_staff_relationships_delete_type:")) {
        if (!policy.canAccess(interaction, "relationships", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const pageNumber = Number(interaction.customId.split(":")[1]);
        try {
            require("../../managers/RelationshipTypeV2Manager")
                .delete(interaction.guildId, Number(interaction.values[0]));
        } catch (error) {
            await replyError(interaction, error);
            return true;
        }
        await interaction.update(
            require("../../pages/staff/StaffRelationshipsPage")
                .buildTypeManagement(interaction, pageNumber)
        );
        return true;
    }
    if (interaction.customId?.startsWith("v2_staff_automations_") && [
        "v2_staff_automations_required_role",
        "v2_staff_automations_remove_role",
        "v2_staff_automations_add_role",
        "v2_staff_automations_welcome_channel"
    ].includes(interaction.customId)) {
        if (!policy.canAccess(interaction, "automations", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const fields = {
            v2_staff_automations_required_role: "requiredRoleId",
            v2_staff_automations_remove_role: "removeRoleId",
            v2_staff_automations_add_role: "addRoleId",
            v2_staff_automations_welcome_channel: "welcomeChannelId"
        };
        const drafts = require("../../services/automation/ApprovalAutomationDraftService");
        const draft = drafts.update(interaction.guildId, interaction.user.id, {
            [fields[interaction.customId]]: interaction.values[0] || null
        });
        await interaction.update(
            require("../../pages/staff/StaffAutomationsPage").buildApprovalConfiguration(interaction, draft)
        );
        return true;
    }
    if (interaction.customId === "v2_staff_logs_channel") {
        if (!policy.canAccess(interaction, "logs", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        require("../../managers/GuildSettingsV2Manager")
            .setErrorLogChannel(interaction.guildId, interaction.values[0]);
        await interaction.update(require("../../pages/staff/StaffLogsPage").build(interaction));
        return true;
    }
    if (interaction.customId === "v2_staff_settings_validation_channel") {
        if (!policy.canAccess(interaction, "settings", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        require("../../managers/GuildSettingsV2Manager")
            .setValidationChannel(interaction.guildId, interaction.values[0]);
        await interaction.update(require("../../pages/staff/StaffSettingsPage").build(interaction));
        return true;
    }
    if (interaction.customId?.startsWith("v2_staff_settings_advanced_remove:")) {
        if (!policy.canAccess(interaction, "settings", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        require("../../managers/GuildAdvancedSettingV2Manager")
            .remove(interaction.guildId, interaction.values[0]);
        await interaction.update(
            require("../../pages/staff/StaffSettingsPage").buildAdvanced(
                interaction,
                Number(interaction.customId.split(":")[1])
            )
        );
        return true;
    }
    if (interaction.customId === "v2_staff_settings_create_validation_role") {
        if (!policy.canAccess(interaction, "settings", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const { ChannelType, PermissionFlagsBits } = require("discord.js");
        const staffRoleId = interaction.values[0];
        try {
            await interaction.deferUpdate();
            const createdChannel = await interaction.guild.channels.create({
                name: "📋・validations",
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: staffRoleId,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    },
                    {
                        id: interaction.guild.members.me.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages
                        ]
                    }
                ],
                reason: "Configuration GreyCore : salon de validation"
            });
            require("../../managers/GuildSettingsV2Manager")
                .setValidationChannel(interaction.guildId, createdChannel.id);
            await interaction.editReply(
                require("../../pages/staff/StaffSettingsPage").build(interaction)
            );
        } catch (error) {
            await require("../../core/services/InteractionResponseService")
                .editOrReplyError(interaction, "Impossible de créer le salon privé. Vérifie que GreyCore peut gérer les salons et leurs permissions.");
        }
        return true;
    }
    if (interaction.customId === "v2_staff_modules_toggle") {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canAccess(interaction, "modules", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const manager = require("../../managers/GuildModuleV2Manager");
        const moduleKey = interaction.values[0];
        if (!manager.getModule(moduleKey)) {
            await replyError(interaction, "Module inconnu.");
            return true;
        }
        manager.setEnabled(interaction.guildId, moduleKey, !manager.isEnabled(interaction.guildId, moduleKey));
        await interaction.update(require("../../pages/staff/StaffModulesPage").build(interaction));
        return true;
    }
    if (interaction.customId === "v2_staff_scenes_zone_select") {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        if (!policy.canAccess(interaction, "scenes", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        require("../../managers/SceneAssistantV2Manager").addScope({
            guildId: interaction.guildId,
            channelId: interaction.values[0],
            createdBy: interaction.user.id
        });
        await interaction.update(
            require("../../pages/staff/StaffScenesPage").build(interaction)
        );
        return true;
    }
    if (interaction.customId === "v2_staff_characters_user_select") {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
        const userId = interaction.values[0];
        const roster = require("../../managers/CharacterRosterV2Manager")
            .getByOwnerOnGuild(interaction.guildId, userId);
        const lines = roster.map(character =>
            `${character.is_archived ? "📦" : "✅"} ${character.firstname || character.proxy_name}`
        );
        await interaction.update({
            content: "",
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("🛠️ Gestion d'un utilisateur")
                .setDescription([
                    `Utilisateur : <@${userId}>`,
                    "",
                    ...(lines.length ? lines : ["Aucun personnage installé sur ce serveur."])
                ].join("\n"))],
            components: [
                ...(roster.length ? [new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("v2_staff_characters_manage_character")
                        .setPlaceholder("Corriger ou supprimer un personnage")
                        .addOptions(roster.slice(0, 25).map(character => ({
                            label: String(character.firstname || character.proxy_name).slice(0, 100),
                            description: character.is_archived ? "Personnage archivé" : "Personnage actif",
                            value: String(character.id),
                            emoji: character.is_archived ? "📦" : "👤"
                        })))
                )] : []),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`v2_staff_characters_archive:${userId}`)
                        .setLabel("Archiver les personnages actifs")
                        .setEmoji("📦")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`v2_staff_characters_restore:${userId}`)
                        .setLabel("Restaurer les archives")
                        .setEmoji("♻️")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`v2_staff_characters_delete_owner:${userId}`)
                        .setLabel("Supprimer tous")
                        .setEmoji("🗑️")
                        .setStyle(ButtonStyle.Danger)
                ),
                require("../../pages/staff/StaffCharactersPage").navigationRow()
            ]
        });
        return true;
    }

    if (interaction.customId === "v2_staff_characters_manage_character") {
        if (!policy.canManageCharacters(interaction)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const service = require("../../services/character/CharacterTypeCorrectionService");
        try {
            const context = service.getForStaff({
                guildId: interaction.guildId,
                characterId: interaction.values[0]
            });
            await interaction.update(require("../../views/character/StaffCharacterCorrectionView").build(context));
        } catch (error) {
            await replyError(interaction, error);
        }
        return true;
    }

    if (interaction.customId === "v2_staff_permissions_role") {
        if (!policy.canManagePermissions(interaction)) {
            await replyError(
                interaction,
                "Tu ne peux pas modifier les permissions GreyCore."
            );
            return true;
        }
        await interaction.update(
            page.buildPermissionSelection(
                interaction.guildId,
                interaction.values[0],
                "role"
            )
        );
        return true;
    }

    if (interaction.customId === "v2_staff_permissions_user") {
        if (!policy.canManagePermissions(interaction)) {
            await replyError(
                interaction,
                "Tu ne peux pas modifier les permissions GreyCore."
            );
            return true;
        }
        await interaction.update(
            page.buildPermissionSelection(
                interaction.guildId,
                interaction.values[0],
                "user"
            )
        );
        return true;
    }

    if (interaction.customId?.startsWith("v2_staff_permissions_save:")) {
        if (!policy.canManagePermissions(interaction)) {
            await replyError(
                interaction,
                "Tu ne peux pas modifier les permissions GreyCore."
            );
            return true;
        }

        const [, subjectType, subjectId] =
            interaction.customId.split(":");
        const selected = interaction.values.includes("__none__")
            ? []
            : interaction.values;
        const saved = subjectType === "user"
            ? manager.replaceUserPermissions({
                guildId: interaction.guildId,
                discordUserId: subjectId,
                permissionKeys: selected,
                grantedBy: interaction.user.id
            })
            : manager.replaceRolePermissions({
                guildId: interaction.guildId,
                roleId: subjectId,
                permissionKeys: selected,
                grantedBy: interaction.user.id
            });
        const subjectMention = subjectType === "user"
            ? `<@${subjectId}>`
            : `<@&${subjectId}>`;

        await interaction.update({
            content: saved.length
                ? `✅ Permissions de ${subjectMention} enregistrées : **${saved.length}** domaine(s).`
                : `✅ Toutes les permissions GreyCore de ${subjectMention} ont été retirées.`,
            embeds: [],
            components: [
                require("discord.js").ActionRowBuilder.from({
                    type: 1,
                    components: [{
                        type: 2,
                        custom_id: "page:staff:section:permissions",
                        label: "Configurer un autre rôle",
                        emoji: { name: "🔐" },
                        style: 2
                    }, {
                        type: 2,
                        custom_id: "page:staff:home:root",
                        label: "Accueil",
                        emoji: { name: "🏠" },
                        style: 2
                    }]
                })
            ]
        });
        return true;
    }

    return false;
};
