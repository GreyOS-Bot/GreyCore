const page = require("../../pages/staff/StaffPermissionsPage");
const policy = require("../../core/policies/StaffPermissionPolicy");
const administrativeAccess = require("../../core/services/AdministrativePermissionAccessService");
const manager = require("../../managers/StaffPermissionV2Manager");
const { replyError } = require(
    "../../core/services/InteractionResponseService"
);

module.exports = async interaction => {
    const characterReadAction = interaction.customId?.startsWith("v2_staff_character_gender_select:")
        || interaction.customId === "v2_staff_characters_statistics_user_select"
        || interaction.customId === "v2_staff_characters_user_select";
    if (characterReadAction && !policy.canAccess(interaction, "characters", { write: false })) {
        await replyError(interaction, "Tu n’as pas accès à la gestion des personnages.");
        return true;
    }

    if (
        interaction.customId === "v3_staff_permissions_role"
        || interaction.customId === "v3_staff_permissions_user"
    ) {
        if (!policy.canManagePermissions(interaction)) {
            await replyError(interaction, "Tu ne peux pas modifier les permissions GreyCore.");
            return true;
        }
        if (!Array.isArray(interaction.values) || interaction.values.length !== 1) {
            await replyError(interaction, "Choisis exactement un rôle ou un utilisateur.");
            return true;
        }
        const subjectType = interaction.customId.endsWith("_user")
            ? "user"
            : "role";
        const draft = require("../../services/permissions/StaffPermissionV3DraftService")
            .start({
                guildId: interaction.guildId,
                adminUserId: interaction.user.id,
                subjectType,
                subjectId: interaction.values[0]
            });
        await interaction.update(page.buildV3PermissionSelection(draft));
        return true;
    }

    if (interaction.customId?.startsWith("v3_staff_permissions_key:")) {
        if (!policy.canManagePermissions(interaction)) {
            await replyError(interaction, "Tu ne peux pas modifier les permissions GreyCore.");
            return true;
        }
        const token = interaction.customId.split(":")[1];
        const drafts = require("../../services/permissions/StaffPermissionV3DraftService");
        const draft = drafts.get(token, interaction.guildId, interaction.user.id);
        if (!draft) {
            await replyError(interaction, expiredPermissionsMessage());
            return true;
        }
        const permissionKey = interaction.values?.[0];
        const catalog = require("../../core/permissions/StaffPermissionCatalog");
        if (interaction.values?.length !== 1 || !catalog.has(permissionKey)) {
            await replyError(interaction, "Cette permission GreyCore n’est pas disponible.");
            return true;
        }
        const assignment = draft.subjectType === "user"
            ? manager.getUserPermissionAssignment(
                draft.guildId, draft.subjectId, permissionKey
            )
            : manager.getRolePermissionAssignment(
                draft.guildId, draft.subjectId, permissionKey
            );
        drafts.selectPermission(draft, permissionKey, toExpected(assignment));
        await interaction.update(page.buildV3PermissionState(draft, assignment));
        return true;
    }

    if (interaction.customId?.startsWith("v3_staff_permission_default_key:")) {
        if (!policy.canManagePermissions(interaction)) {
            await replyError(interaction, "Tu ne peux pas modifier les permissions GreyCore.");
            return true;
        }
        const token = interaction.customId.split(":")[1];
        const drafts = require("../../services/permissions/StaffPermissionV3DraftService");
        const draft = drafts.get(token, interaction.guildId, interaction.user.id);
        if (!draft || draft.subjectType !== "guild-default") {
            await replyError(interaction, expiredPermissionsMessage());
            return true;
        }
        const permissionKey = interaction.values?.[0];
        const catalog = require("../../core/permissions/StaffPermissionCatalog");
        if (interaction.values?.length !== 1 || !catalog.has(permissionKey)) {
            await replyError(interaction, "Cette permission GreyCore n’est pas disponible.");
            return true;
        }
        const current = manager.getPermissionDefault(
            draft.guildId, permissionKey
        );
        drafts.selectPermission(draft, permissionKey, toExpected(current));
        await interaction.update(
            page.buildV3DefaultPermissionState(draft, current)
        );
        return true;
    }

    if (interaction.customId === "v2_staff_scenes_public_forum_select") {
        if (!administrativeAccess.canWrite(interaction, "scenes")) {
            await replyError(interaction, "Tu n’as pas accès aux cycles de scènes.");
            return true;
        }
        await interaction.deferUpdate();
        const forum = await interaction.guild.channels.fetch(interaction.values[0]);
        if (!forum?.threads) {
            await replyError(interaction, "Ce forum est introuvable.");
            return true;
        }
        const places = await require("../../services/publicPlaces/PublicPlaceForumService")
            .synchronize(interaction.guildId, forum);
        await interaction.editReply(
            require("../../views/staff/StaffPublicPlacesView").build(interaction, forum, places)
        );
        return true;
    }

    if (interaction.customId?.startsWith("v2_staff_public_place_category:")) {
        if (!administrativeAccess.canWrite(interaction, "scenes")) {
            await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
            return true;
        }
        const [, forumId, channelId, rawPage] = interaction.customId.split(":");
        const service = require("../../services/publicPlaces/PublicPlaceForumService");
        service.categorize(interaction.guildId, channelId, interaction.values[0]);
        const forum = await interaction.guild.channels.fetch(forumId);
        const places = service.get(interaction.guildId, forumId);
        await interaction.update(
            require("../../views/staff/StaffPublicPlacesView").build(
                interaction, forum, places, null, Number(rawPage) || 0
            )
        );
        return true;
    }

    if (interaction.customId?.startsWith("v2_staff_public_place_pick:")) {
        if (!require("../../core/services/AdministrativePermissionAccessService")
            .canRead(interaction, "scenes")) {
            await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
            return true;
        }
        const [, forumId, rawPage] = interaction.customId.split(":");
        const forum = await interaction.guild.channels.fetch(forumId);
        const places = require("../../services/publicPlaces/PublicPlaceForumService")
            .get(interaction.guildId, forumId);
        await interaction.update(
            require("../../views/staff/StaffPublicPlacesView").build(
                interaction, forum, places, interaction.values[0], Number(rawPage) || 0
            )
        );
        return true;
    }

    if (interaction.customId?.startsWith("v2_staff_character_gender_select:")) {
        const pageNumber = Number(interaction.customId.split(":")[1]) || 0;
        const character = require("../../managers/CharacterRosterV2Manager")
            .getRoster(interaction.guildId, { includeArchived: false })
            .find(item => String(item.id) === String(interaction.values[0]));
        if (!character) {
            await replyError(interaction, "Ce personnage validé est introuvable sur ce serveur.");
            return true;
        }
        await interaction.update(
            require("../../views/staff/StaffCharacterGenderView").buildChoice(character, pageNumber)
        );
        return true;
    }

    if (interaction.customId === "v2_staff_characters_statistics_user_select") {
        const userId = interaction.values[0];
        const roster = require("../../managers/CharacterRosterV2Manager")
            .getRoster(interaction.guildId, { includeArchived: false })
            .filter(character => String(character.discord_user_id) === String(userId));
        const deferred = typeof interaction.deferUpdate === "function"
            && typeof interaction.editReply === "function";
        if (deferred) await interaction.deferUpdate();
        if (!interaction.guild?.members?.cache?.has(String(userId)) && interaction.guild?.members?.fetch) {
            await interaction.guild.members.fetch(String(userId)).catch(() => null);
        }
        const userNames = new Map();
        if (interaction.client?.users?.fetch) {
            const user = await interaction.client.users.fetch(String(userId)).catch(() => null);
            const name = user?.globalName || user?.username;
            if (name) userNames.set(String(userId), name);
        }
        const payload = require("../../views/staff/CharacterStatisticsView")
            .buildUser(userId, roster, interaction.guild, userNames);
        if (deferred) await interaction.editReply(payload);
        else await interaction.update(payload);
        return true;
    }

    if (interaction.customId === "v2_staff_characters_cancel_installation_select") {
        const validationAccess = require("../../core/services/ValidationPermissionAccessService");
        if (!validationAccess.canWrite(interaction)) {
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
        if (!administrativeAccess.canWrite(interaction, "scenes")) {
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
        if (!administrativeAccess.canWrite(interaction, "automations")) {
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
        if (!administrativeAccess.canWrite(interaction, "logs")) {
            await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
            return true;
        }
        require("../../managers/GuildSettingsV2Manager")
            .setErrorLogChannel(interaction.guildId, interaction.values[0]);
        await interaction.update(require("../../pages/staff/StaffLogsPage").build(interaction));
        return true;
    }
    if (interaction.customId === "v2_staff_settings_validation_channel") {
        if (!administrativeAccess.canWrite(interaction, "settings")) {
            await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
            return true;
        }
        require("../../managers/GuildSettingsV2Manager")
            .setValidationChannel(interaction.guildId, interaction.values[0]);
        await interaction.update(require("../../pages/staff/StaffSettingsPage").build(interaction));
        return true;
    }
    if (interaction.customId?.startsWith("v2_staff_settings_advanced_remove:")) {
        if (!administrativeAccess.canWrite(interaction, "settings")) {
            await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
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
        if (!administrativeAccess.canWrite(interaction, "settings")) {
            await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
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
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!administrativeAccess.canWrite(interaction, "modules")) {
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
        if (!administrativeAccess.canWrite(interaction, "scenes")) {
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
        if (!policy.canAccess(interaction, "characters", { write: false })) {
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

    if (
        interaction.customId === "v2_staff_permissions_role"
        || interaction.customId === "v2_staff_permissions_user"
        || interaction.customId?.startsWith("v2_staff_permissions_save:")
    ) {
        await replyError(
            interaction,
            "Cette interface de permissions a expiré. Rouvre le centre staff pour utiliser la nouvelle gestion des permissions."
        );
        return true;
    }

    return false;
};

function toExpected(assignment) {
    return assignment ? {
        present: true,
        effect: assignment.effect,
        updatedAt: assignment.updatedAt
    } : { present: false };
}

function expiredPermissionsMessage() {
    return "Cette interface de permissions a expiré. Rouvre le centre staff.";
}
