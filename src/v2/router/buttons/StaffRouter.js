module.exports = async interaction => {
    if (!interaction.isButton?.()) return false;
    if (!interaction.customId) return false;

    if (interaction.customId === "v3_staff_permission_defaults") {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canManagePermissions(interaction)) {
            await replyError(interaction, "Tu ne peux pas modifier les permissions GreyCore.");
            return true;
        }
        const draft = require("../../services/permissions/StaffPermissionV3DraftService")
            .startDefault({
                guildId: interaction.guildId,
                adminUserId: interaction.user.id
            });
        await interaction.update(
            require("../../pages/staff/StaffPermissionsPage")
                .buildV3DefaultPermissionSelection(draft)
        );
        return true;
    }

    if (interaction.customId.startsWith("v3_staff_permission_default_set:")) {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canManagePermissions(interaction)) {
            await replyError(interaction, "Tu ne peux pas modifier les permissions GreyCore.");
            return true;
        }
        const [, token, action] = interaction.customId.split(":");
        if (!new Set(["allow", "deny", "unset"]).has(action)) {
            await replyError(interaction, "Cette action de permission est invalide.");
            return true;
        }
        const drafts = require("../../services/permissions/StaffPermissionV3DraftService");
        const draft = drafts.get(token, interaction.guildId, interaction.user.id);
        if (draft?.subjectType !== "guild-default"
            || !draft.permissionKey || !draft.expected) {
            await replyError(
                interaction,
                "Cette interface de permissions a expiré. Rouvre le centre staff."
            );
            return true;
        }
        const manager = require("../../managers/StaffPermissionV2Manager");
        const common = {
            guildId: draft.guildId,
            permissionKey: draft.permissionKey,
            actorId: interaction.user.id,
            expected: draft.expected
        };
        const result = action === "unset"
            ? manager.clearPermissionDefaultOptimistic(common)
            : manager.setPermissionDefaultOptimistic({
                ...common, effect: action
            });
        const current = manager.getPermissionDefault(
            draft.guildId, draft.permissionKey
        );
        drafts.rotate(draft, current ? {
            present: true,
            effect: current.effect,
            updatedAt: current.updatedAt
        } : { present: false });
        const notice = result.status === "stale"
            ? "⚠️ Cette valeur par défaut a été modifiée entre-temps. L’état actuel a été rechargé."
            : result.status === "noop"
                ? "ℹ️ Cette valeur par défaut était déjà non définie."
                : "✅ Valeur par défaut mise à jour.";
        await interaction.update(
            require("../../pages/staff/StaffPermissionsPage")
                .buildV3DefaultPermissionState(draft, current, notice)
        );
        return true;
    }

    if (interaction.customId.startsWith("v3_staff_permissions_set:")) {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canManagePermissions(interaction)) {
            await replyError(interaction, "Tu ne peux pas modifier les permissions GreyCore.");
            return true;
        }
        const [, token, action] = interaction.customId.split(":");
        if (!new Set(["allow", "deny", "unset"]).has(action)) {
            await replyError(interaction, "Cette action de permission est invalide.");
            return true;
        }
        const drafts = require("../../services/permissions/StaffPermissionV3DraftService");
        const draft = drafts.get(token, interaction.guildId, interaction.user.id);
        if (!draft?.permissionKey || !draft.expected) {
            await replyError(
                interaction,
                "Cette interface de permissions a expiré. Rouvre le centre staff."
            );
            return true;
        }
        const manager = require("../../managers/StaffPermissionV2Manager");
        const common = {
            guildId: draft.guildId,
            permissionKey: draft.permissionKey,
            actorId: interaction.user.id,
            expected: draft.expected
        };
        let result;
        if (draft.subjectType === "user") {
            result = action === "unset"
                ? manager.clearUserPermissionAssignment({
                    ...common, discordUserId: draft.subjectId
                })
                : manager.setUserPermissionAssignment({
                    ...common, discordUserId: draft.subjectId, effect: action
                });
        } else {
            result = action === "unset"
                ? manager.clearRolePermissionAssignment({
                    ...common, roleId: draft.subjectId
                })
                : manager.setRolePermissionAssignment({
                    ...common, roleId: draft.subjectId, effect: action
                });
        }

        const current = draft.subjectType === "user"
            ? manager.getUserPermissionAssignment(
                draft.guildId, draft.subjectId, draft.permissionKey
            )
            : manager.getRolePermissionAssignment(
                draft.guildId, draft.subjectId, draft.permissionKey
            );
        drafts.rotate(draft, current ? {
            present: true,
            effect: current.effect,
            updatedAt: current.updatedAt
        } : { present: false });
        const notice = result.status === "stale"
            ? "⚠️ Cette permission a été modifiée entre-temps. L’état actuel a été rechargé."
            : result.status === "noop"
                ? "ℹ️ La permission héritait déjà de la configuration générale."
                : "✅ Permission mise à jour.";
        await interaction.update(
            require("../../pages/staff/StaffPermissionsPage")
                .buildV3PermissionState(draft, current, notice)
        );
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_domain_toggle:")) {
        const { replyError } = require("../../core/services/InteractionResponseService");
        const moduleKey = interaction.customId.split(":")[1];
        const pages = {
            phone: "StaffPhonePage",
            assets: "StaffAssetsPage",
            relationships: "StaffRelationshipsPage"
        };
        if (!Object.hasOwn(pages, moduleKey)) {
            await replyError(interaction, "Module inconnu.");
            return true;
        }
        if (!require("../../core/services/AdministrativePermissionAccessService")
            .canWrite(interaction, "modules")) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const moduleManager = require("../../managers/GuildModuleV2Manager");
        if (!moduleManager.getModule(moduleKey)) {
            await replyError(interaction, "Module inconnu.");
            return true;
        }
        const enabled = !moduleManager.isEnabled(interaction.guildId, moduleKey);
        moduleManager.setEnabled(
            interaction.guildId,
            moduleKey,
            enabled
        );
        if (!hasStrictAccess(interaction, moduleKey, false)) {
            await interaction.update({
                content: enabled ? "✅ Module activé." : "✅ Module désactivé.",
                embeds: [],
                components: []
            });
            return true;
        }
        await interaction.update(require(`../../pages/staff/${pages[moduleKey]}`).build(interaction));
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_character_balance_alert:")) {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictCharacterAccess(interaction, true)) {
            await replyError(interaction, "Cette alerte est réservée au staff chargé des personnages.");
            return true;
        }
        await require("../../core/services/InteractionResponseService").deferPrivate(interaction);
        const userId = interaction.customId.split(":")[1];
        const roster = require("../../managers/CharacterRosterV2Manager")
            .getRoster(interaction.guildId, { includeArchived: false });
        try {
            const balance = await require("../../services/statistics/CharacterBalanceAlertService")
                .notifyUser({
                    guild: interaction.guild,
                    userId,
                    client: interaction.client,
                    roster,
                    requestedBy: interaction.user?.username || interaction.user?.id
                });
            await interaction.editReply(
                `✅ Alerte envoyée en message privé à <@${userId}> · écart de **${balance.difference}**.`
            );
        } catch (error) {
            await interaction.editReply(`❌ ${error.message || "L’alerte n’a pas pu être envoyée."}`);
        }
        return true;
    }

    if (interaction.customId === "v2_staff_relationships_install_defaults") {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictAccess(interaction, "relationships", true)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        require("../../managers/RelationshipTypeV2Manager")
            .installDefaults(interaction.guildId);
        await interaction.update(
            require("../../pages/staff/StaffRelationshipsPage").build(interaction)
        );
        return true;
    }

    if (interaction.customId === "v2_staff_relationships_create_type") {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictAccess(interaction, "relationships", true)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
        await interaction.showModal(new ModalBuilder()
            .setCustomId("v2_staff_relationships_create_type_submit")
            .setTitle("Nouveau type de relation")
            .addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId("label_a_to_b").setLabel("Libellé principal")
                    .setPlaceholder("Ex. Mentor de").setStyle(TextInputStyle.Short)
                    .setMaxLength(80).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId("label_b_to_a").setLabel("Libellé inverse si nécessaire")
                    .setPlaceholder("Ex. Protégé·e de").setStyle(TextInputStyle.Short)
                    .setMaxLength(80).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId("symmetric").setLabel("Relation symétrique ? oui ou non")
                    .setPlaceholder("non").setStyle(TextInputStyle.Short)
                    .setMaxLength(3).setRequired(true))
            ));
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_relationships_manage_types:")) {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictAccess(interaction, "relationships", false)) {
            await replyError(interaction, "Tu n'as pas accès à la gestion des relations.");
            return true;
        }
        const page = Number(interaction.customId.split(":")[1]);
        await interaction.update(
            require("../../pages/staff/StaffRelationshipsPage").buildTypeManagement(interaction, page)
        );
        return true;
    }

    if (interaction.customId === "v2_staff_bank_install_defaults") {
        await require("../../core/services/InteractionResponseService")
            .replyInactiveInterface(interaction);
        return true;
    }

    if (interaction.customId === "v2_staff_assets_install_defaults") {
        const decisionService = require("../../core/services/StaffPermissionDecisionService");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!decisionService.decide({
            interaction,
            permission: "assets",
            write: true
        }).allowed) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        require("../../managers/AssetTypeV2Manager").ensureDefaults(interaction.guildId);
        await interaction.update(require("../../pages/staff/StaffAssetsPage").build(interaction));
        return true;
    }

    if (interaction.customId === "v2_staff_universe_install_states") {
        const decisionService = require("../../core/services/StaffPermissionDecisionService");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!decisionService.decide({
            interaction,
            permission: "characters",
            write: true
        }).allowed) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        require("../../managers/StateTypeV2Manager")
            .installDefaultStateTypes(interaction.guildId, interaction.user.id);
        if (!hasStrictAccess(interaction, "universe", false)) {
            await interaction.update({ content: "✅ Types d’état installés.", embeds: [], components: [] });
            return true;
        }
        await interaction.update(require("../../pages/staff/StaffUniversePage").build(interaction));
        return true;
    }

    if (interaction.customId === "v2_staff_universe_create_state") {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictAccess(interaction, "characters", true)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
        await interaction.showModal(new ModalBuilder()
            .setCustomId("v2_staff_universe_create_state_submit")
            .setTitle("Nouveau type d’état")
            .addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId("name").setLabel("Nom de l’état")
                    .setStyle(TextInputStyle.Short).setMaxLength(80).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId("emoji").setLabel("Emoji (facultatif)")
                    .setStyle(TextInputStyle.Short).setMaxLength(32).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId("color").setLabel("Couleur hexadécimale (facultatif)")
                    .setPlaceholder("#E67E22").setStyle(TextInputStyle.Short)
                    .setMaxLength(7).setRequired(false))
            ));
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_universe_manage_states:")) {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictAccess(interaction, "universe", false)) {
            await replyError(interaction, "Tu n'as pas accès à la gestion de l’univers.");
            return true;
        }
        await interaction.update(require("../../pages/staff/StaffUniversePage")
            .buildStateManagement(interaction, Number(interaction.customId.split(":")[1])));
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_automations_")) {
        const administrativeAccess = require("../../core/services/AdministrativePermissionAccessService");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!administrativeAccess.canWrite(interaction, "automations")) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const action = interaction.customId.slice("v2_staff_automations_".length);
        const settings = require("../../managers/GuildSettingsV2Manager");
        const page = require("../../pages/staff/StaffAutomationsPage");
        const drafts = require("../../services/automation/ApprovalAutomationDraftService");
        if (action === "announcement") {
            await interaction.showModal(require("../../modals/AnnouncementModal").build());
            return true;
        }
        if (action === "configure_approval") {
            const configuration = require("../../managers/CharacterApprovalAutomationV2Manager")
                .getConfiguration(interaction.guildId);
            const draft = drafts.start(interaction.guildId, interaction.user.id, configuration);
            await interaction.update(page.buildApprovalConfiguration(interaction, draft));
            return true;
        }
        if (action === "cancel_approval") {
            drafts.clear(interaction.guildId, interaction.user.id);
            await interaction.update(page.build(interaction));
            return true;
        }
        if (action === "approval_details") {
            const draft = drafts.get(interaction.guildId, interaction.user.id);
            if (!draft) {
                await replyError(interaction, "Cette configuration a expiré. Ouvre-la de nouveau.");
                return true;
            }
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
            const threshold = new TextInputBuilder()
                .setCustomId("approved_count").setLabel("Personnages validés nécessaires")
                .setStyle(TextInputStyle.Short).setRequired(true)
                .setValue(String(draft.approvedCharacterCount));
            const message = new TextInputBuilder()
                .setCustomId("welcome_message").setLabel("Message de bienvenue (facultatif)")
                .setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(2000);
            if (draft.welcomeMessage) message.setValue(draft.welcomeMessage.slice(0, 2000));
            await interaction.showModal(new ModalBuilder()
                .setCustomId("v2_staff_automations_approval_submit")
                .setTitle("Finaliser l’automatisation")
                .addComponents(new ActionRowBuilder().addComponents(threshold), new ActionRowBuilder().addComponents(message)));
            return true;
        }
        if (action === "toggle_limit") {
            const current = settings.getPlayedCharacterCreationLimit(interaction.guildId);
            settings.configurePlayedCharacterCreationLimit(interaction.guildId, {
                enabled: !current.enabled,
                limitCount: current.limitCount,
                windowDays: current.windowDays
            });
            await interaction.update(page.build(interaction));
            return true;
        }
        if (action === "disable_approval") {
            require("../../managers/CharacterApprovalAutomationV2Manager").disable(interaction.guildId);
            await interaction.update(page.build(interaction));
            return true;
        }
        if (action === "creation_limit") {
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
            const current = settings.getPlayedCharacterCreationLimit(interaction.guildId);
            const modal = new ModalBuilder()
                .setCustomId("v2_staff_automations_creation_limit_submit")
                .setTitle("Limite de création des PJ")
                .addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder()
                        .setCustomId("limit_count").setLabel("Nombre maximal de PJ")
                        .setStyle(TextInputStyle.Short).setRequired(true).setValue(String(current.limitCount))),
                    new ActionRowBuilder().addComponents(new TextInputBuilder()
                        .setCustomId("window_days").setLabel("Période en jours")
                        .setStyle(TextInputStyle.Short).setRequired(true).setValue(String(current.windowDays)))
                );
            await interaction.showModal(modal);
            return true;
        }
    }

    if (interaction.customId === "v2_staff_logs_remove_channel") {
        const administrativeAccess = require("../../core/services/AdministrativePermissionAccessService");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!administrativeAccess.canWrite(interaction, "logs")) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        require("../../managers/GuildSettingsV2Manager").removeErrorLogChannel(interaction.guildId);
        await interaction.update(require("../../pages/staff/StaffLogsPage").build(interaction));
        return true;
    }

    if (interaction.customId === "v2_staff_logs_test") {
        const administrativeAccess = require("../../core/services/AdministrativePermissionAccessService");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!administrativeAccess.canWrite(interaction, "logs")) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const channelId = require("../../managers/GuildSettingsV2Manager")
            .getErrorLogChannelId(interaction.guildId);
        const channel = channelId
            ? await interaction.client.channels.fetch(channelId).catch(() => null)
            : null;
        if (!channel?.isTextBased?.()) {
            await replyError(interaction, "Le salon des journaux est introuvable ou inaccessible à GreyCore.");
            return true;
        }
        const { EmbedBuilder } = require("discord.js");
        await channel.send({
            embeds: [new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle("✅ Test des journaux GreyCore")
                .setDescription("Le salon est correctement configuré et GreyCore peut y envoyer ses alertes de maintenance.")
                .addFields(
                    { name: "Serveur", value: `${interaction.guild?.name || "Serveur"} (${interaction.guildId})` },
                    { name: "Test demandé par", value: `${interaction.user} (${interaction.user.id})` }
                )
                .setTimestamp()]
        });
        await interaction.update({
            ...require("../../pages/staff/StaffLogsPage").build(interaction),
            content: `✅ Alerte de test envoyée dans <#${channelId}>.`
        });
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_settings_")) {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const administrativeAccess = require("../../core/services/AdministrativePermissionAccessService");
        const { replyError } = require("../../core/services/InteractionResponseService");
        const action = interaction.customId.slice("v2_staff_settings_".length);
        const readOnlyActions = action === "advanced"
            || action.startsWith("advanced_page:")
            || action === "privacy_policy"
            || action === "charter";
        const allowed = readOnlyActions
            ? administrativeAccess.canRead(interaction, "settings")
            : administrativeAccess.canWrite(interaction, "settings");
        if (!allowed) {
            await replyError(
                interaction,
                readOnlyActions
                    ? "Tu n’as pas accès aux paramètres GreyCore."
                    : "Tu disposes uniquement d'un accès en lecture."
            );
            return true;
        }
        const settings = require("../../managers/GuildSettingsV2Manager");
        const page = require("../../pages/staff/StaffSettingsPage");
        if (action === "privacy_policy" || action === "charter") {
            await interaction.update(page.buildLegal(interaction, action));
            return true;
        }
        if (action === "advanced") {
            await interaction.update(page.buildAdvanced(interaction));
            return true;
        }
        if (action.startsWith("advanced_page:")) {
            await interaction.update(
                page.buildAdvanced(interaction, Number(action.split(":")[1]))
            );
            return true;
        }
        if (action === "advanced_set") {
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
            await interaction.showModal(new ModalBuilder()
                .setCustomId("v2_staff_settings_advanced_set_submit")
                .setTitle("Paramètre avancé")
                .addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder()
                        .setCustomId("key").setLabel("Clé du paramètre")
                        .setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder()
                        .setCustomId("value").setLabel("Valeur")
                        .setStyle(TextInputStyle.Paragraph).setMaxLength(4000).setRequired(true))
                ));
            return true;
        }
        if (action === "create_validation") {
            const { EmbedBuilder, ActionRowBuilder, RoleSelectMenuBuilder } = require("discord.js");
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle("📋 Créer le salon de validation")
                    .setDescription("Choisis le rôle qui doit accéder au futur salon privé. GreyCore créera le salon, réglera ses permissions et l’enregistrera automatiquement.")],
                components: [
                    new ActionRowBuilder().addComponents(
                        new RoleSelectMenuBuilder()
                            .setCustomId("v2_staff_settings_create_validation_role")
                            .setPlaceholder("Choisir le rôle du staff")
                            .setMinValues(1)
                            .setMaxValues(1)
                    ),
                    require("../../pages/staff/StaffCharactersPage").navigationRow()
                ]
            });
            return true;
        }
        if (action === "remove_validation") {
            settings.removeValidationChannel(interaction.guildId);
            await interaction.update(page.build(interaction));
            return true;
        }
        if (action === "toggle_maintenance") {
            const current = settings.getMaintenance(interaction.guildId);
            settings.setMaintenance(interaction.guildId, {
                enabled: !current.enabled,
                message: current.message
            });
            await interaction.update(page.build(interaction));
            return true;
        }
        if (action === "maintenance_message") {
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
            const current = settings.getMaintenance(interaction.guildId);
            const modal = new ModalBuilder()
                .setCustomId("v2_staff_settings_maintenance_submit")
                .setTitle("Message de maintenance")
                .addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("message")
                        .setLabel("Message affiché aux utilisateurs")
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(1000)
                        .setRequired(true)
                        .setValue(current.message.slice(0, 1000))
                ));
            await interaction.showModal(modal);
            return true;
        }
    }

    if (interaction.customId === "v2_staff_permissions_toggle_validation") {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const manager = require("../../managers/StaffPermissionV2Manager");
        const page = require("../../pages/staff/StaffPermissionsPage");
        const { replyError } = require(
            "../../core/services/InteractionResponseService"
        );

        if (!policy.canManagePermissions(interaction)) {
            await replyError(
                interaction,
                "Tu ne peux pas modifier les permissions GreyCore."
            );
            return true;
        }

        const current = manager.getValidationChannelAccess(
            interaction.guildId
        );
        manager.setValidationChannelAccess({
            guildId: interaction.guildId,
            enabled: !current,
            updatedBy: interaction.user.id
        });
        await interaction.update(
            page.buildAccessSelection(interaction.guildId)
        );
        return true;
    }

    const characterReadAction = [
        "v2_staff_characters_pending",
        "v2_staff_characters_roster",
        "v2_staff_characters_statistics_global",
        "v2_staff_characters_statistics_user",
        "v2_staff_characters_genders",
        "v2_staff_characters_users"
    ].includes(interaction.customId)
        || interaction.customId.startsWith("v2_staff_characters_roster_page:")
        || interaction.customId.startsWith("v2_staff_characters_statistics_users_page:")
        || interaction.customId.startsWith("v2_staff_character_genders_page:")
        || interaction.customId.startsWith("v2_staff_character_gender_quick:");
    if (characterReadAction) {
        const { replyError } = require("../../core/services/InteractionResponseService");
        const allowed = interaction.customId === "v2_staff_characters_pending"
            ? require("../../core/services/ValidationPermissionAccessService")
                .canRead(interaction)
            : hasStrictCharacterAccess(interaction, false);
        if (!allowed) {
            await replyError(interaction, "Tu n’as pas accès à la gestion des personnages.");
            return true;
        }
    }

    if (interaction.customId === "v2_staff_characters_pending") {
        const manager = require("../../services/validation/ValidationManagerV2");
        const view = require("../../views/validation/PendingValidationsView");
        const navigation = require("../../pages/staff/StaffCharactersPage")
            .navigationRow();
        const payload = view.build(
            interaction.guildId,
            manager.getPendingForGuild(interaction.guildId)
        );
        await interaction.update({ ...payload, components: [navigation] });
        return true;
    }

    if (
        interaction.customId === "v2_staff_characters_roster"
        || interaction.customId.startsWith("v2_staff_characters_roster_page:")
    ) {
        const manager = require("../../managers/CharacterRosterV2Manager");
        const roster = manager.getRoster(interaction.guildId, {
            includeArchived: true
        });
        const page = interaction.customId.includes(":")
            ? Number(interaction.customId.split(":")[1]) || 0
            : 0;
        await interaction.update(
            require("../../views/staff/StaffCharacterRosterView").build(roster, page)
        );
        return true;
    }

    if (interaction.customId === "v2_staff_characters_statistics_global") {
        const roster = require("../../managers/CharacterRosterV2Manager")
            .getRoster(interaction.guildId, { includeArchived: false });
        await interaction.update(
            require("../../views/staff/CharacterStatisticsView").buildGlobal(roster)
        );
        return true;
    }

    if (
        interaction.customId === "v2_staff_characters_statistics_user"
        || interaction.customId.startsWith("v2_staff_characters_statistics_users_page:")
    ) {
        const roster = require("../../managers/CharacterRosterV2Manager")
            .getRoster(interaction.guildId, { includeArchived: false });
        const page = interaction.customId.includes(":")
            ? Number(interaction.customId.split(":")[1]) || 0
            : 0;
const owners = Array.from(new Set(
            roster.map(character => character.discord_user_id).filter(Boolean)
        ));
        const deferred = typeof interaction.deferUpdate === "function"
            && typeof interaction.editReply === "function";
        if (deferred) await interaction.deferUpdate();
        if (interaction.guild?.members?.fetch) {
            for (let index = 0; index < owners.length; index += 100) {
                await interaction.guild.members.fetch({ user: owners.slice(index, index + 100) })
                    .catch(() => null);
            }
        }
        const userNames = new Map();
        if (interaction.client?.users?.fetch) {
            const fetchedUsers = await Promise.all(owners.map(async userId => {
                const user = await interaction.client.users.fetch(String(userId)).catch(() => null);
                return [String(userId), user?.globalName || user?.username || null];
            }));
            fetchedUsers.forEach(([userId, name]) => {
                if (name) userNames.set(userId, name);
            });
        }
        const payload = require("../../views/staff/CharacterStatisticsView")
            .buildUserSelection(roster, interaction.guild, page, userNames);
        if (deferred) await interaction.editReply(payload);
        else await interaction.update(payload);
        return true;
    }

    if (
        interaction.customId === "v2_staff_characters_genders"
        || interaction.customId.startsWith("v2_staff_character_genders_page:")
    ) {
        const page = interaction.customId.includes(":")
            ? Number(interaction.customId.split(":")[1]) || 0
            : 0;
        const roster = require("../../managers/CharacterRosterV2Manager")
            .getRoster(interaction.guildId, { includeArchived: false });
        await interaction.update(
            require("../../views/staff/StaffCharacterGenderView").build(roster, page)
        );
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_character_gender_quick:")) {
        const page = Number(interaction.customId.split(":")[1]) || 0;
        const roster = require("../../managers/CharacterRosterV2Manager")
            .getRoster(interaction.guildId, { includeArchived: false });
        await interaction.update(
            require("../../views/staff/StaffCharacterGenderView").buildQuick(roster, page)
        );
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_character_gender_set:")) {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictCharacterAccess(interaction, true)) {
            await replyError(interaction, "Tu disposes uniquement d’un accès en lecture.");
            return true;
        }
        const [, characterId, selectedGender, rawPage, returnMode] = interaction.customId.split(":");
        const rosterManager = require("../../managers/CharacterRosterV2Manager");
        const roster = rosterManager.getRoster(interaction.guildId, { includeArchived: false });
        const character = roster.find(item => String(item.id) === String(characterId));
        if (!character?.continuity_id) {
            await replyError(interaction, "Ce personnage validé est introuvable sur ce serveur.");
            return true;
        }
        const values = {
            female: "Femme",
            male: "Homme",
            neutral: "Non genré"
        };
        if (!values[selectedGender]) {
            await replyError(interaction, "Ce choix de genre est invalide.");
            return true;
        }
        const profileManager = require("../../managers/ProfileV2Manager");
        profileManager.getOrCreate(character.continuity_id);
        profileManager.update(
            character.continuity_id,
            { gender: values[selectedGender] }
        );
        const updatedRoster = rosterManager.getRoster(interaction.guildId, { includeArchived: false });
        await interaction.update(
            returnMode === "quick"
                ? require("../../views/staff/StaffCharacterGenderView").buildQuick(updatedRoster, Number(rawPage) || 0)
                : require("../../views/staff/StaffCharacterGenderView").build(updatedRoster, Number(rawPage) || 0)
        );
        return true;
    }

    if (interaction.customId === "v2_staff_characters_users") {
        const { ActionRowBuilder, UserSelectMenuBuilder } = require("discord.js");
        await interaction.update({
            content: "Choisis l'utilisateur dont tu souhaites gérer les personnages.",
            embeds: [],
            components: [
                new ActionRowBuilder().addComponents(
                    new UserSelectMenuBuilder()
                        .setCustomId("v2_staff_characters_user_select")
                        .setPlaceholder("Choisir un utilisateur")
                        .setMinValues(1)
                        .setMaxValues(1)
                ),
                require("../../pages/staff/StaffCharactersPage").navigationRow()
            ]
        });
        return true;
    }

    if (interaction.customId === "v2_staff_characters_deploy_all") {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictCharacterAccess(interaction, true)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const result = require("../../services/deployment/DeploymentV2Service").deployAllExisting({
            guildId: interaction.guildId,
            guildName: interaction.guild?.name || interaction.guildId,
            approvedBy: interaction.user.id
        });
        await interaction.update({
            content: result.total
                ? `✅ **${result.total} personnage(s)** ont été déployés sur ce serveur.`
                : "ℹ️ Aucun personnage supplémentaire n’avait besoin d’être déployé.",
            embeds: [],
            components: [require("../../pages/staff/StaffCharactersPage").navigationRow()]
        });
        return true;
    }

    if (interaction.customId === "v2_staff_characters_cancel_installation") {
        const validationAccess = require("../../core/services/ValidationPermissionAccessService");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!validationAccess.canWrite(interaction)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const installations = require("../../services/validation/ValidationManagerV2")
            .searchIncompleteForGuild(interaction.guildId);
        if (!installations.length) {
            await interaction.update({
                content: "✅ Aucune installation non aboutie n’est actuellement bloquée.",
                embeds: [],
                components: [require("../../pages/staff/StaffCharactersPage").navigationRow()]
            });
            return true;
        }
        const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
        await interaction.update({
            content: "",
            embeds: [new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle("🧹 Annuler une installation non aboutie")
                .setDescription("Choisis l’installation à débloquer. Le personnage restera dans la bibliothèque de son propriétaire et pourra être réinstallé.")],
            components: [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("v2_staff_characters_cancel_installation_select")
                        .setPlaceholder("Choisir une installation")
                        .addOptions(installations.map(installation => ({
                            label: String(installation.firstname || installation.proxy_name).slice(0, 100),
                            description: `${installation.status} · propriétaire ${installation.owner_id}`.slice(0, 100),
                            value: String(installation.id)
                        })))
                ),
                require("../../pages/staff/StaffCharactersPage").navigationRow()
            ]
        });
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_character_delete:")) {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictCharacterAccess(interaction, true)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const characterId = interaction.customId.split(":")[1];
        const context = require("../../services/character/CharacterTypeCorrectionService")
            .getForStaff({ guildId: interaction.guildId, characterId });
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
        await interaction.update({
            embeds: [new EmbedBuilder().setColor(0xED4245)
                .setTitle("⚠️ Suppression définitive")
                .setDescription(`Supprimer définitivement **${context.alias || context.firstname || context.proxy_name}** et toutes ses données associées ?`)],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`v2_staff_character_delete_confirm:${characterId}`)
                    .setLabel("Confirmer la suppression").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("page:staff:section:characters")
                    .setLabel("Annuler").setStyle(ButtonStyle.Secondary)
            )]
        });
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_character_delete_confirm:")) {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictCharacterAccess(interaction, true)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const characterId = interaction.customId.split(":")[1];
        require("../../services/character/CharacterTypeCorrectionService")
            .getForStaff({ guildId: interaction.guildId, characterId });
        const result = require("../../managers/CharacterRosterV2Manager").deleteCharacter(characterId);
        await interaction.update({
            content: `🗑️ Personnage supprimé définitivement avec ${result.continuityCount} continuité(s) et ${result.installationCount} installation(s).`,
            embeds: [], components: [require("../../pages/staff/StaffCharactersPage").navigationRow()]
        });
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_characters_delete_owner:")) {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictCharacterAccess(interaction, true)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const userId = interaction.customId.split(":")[1];
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
        await interaction.update({
            embeds: [new EmbedBuilder().setColor(0xED4245).setTitle("⚠️ Suppression définitive")
                .setDescription(`Supprimer définitivement tous les personnages de <@${userId}> installés sur ce serveur ?`)],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`v2_staff_characters_delete_owner_confirm:${userId}`)
                    .setLabel("Tout supprimer").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("page:staff:section:characters")
                    .setLabel("Annuler").setStyle(ButtonStyle.Secondary)
            )]
        });
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_characters_delete_owner_confirm:")) {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictCharacterAccess(interaction, true)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const userId = interaction.customId.split(":")[1];
        const result = require("../../managers/CharacterRosterV2Manager")
            .deleteOwnerCharacters(interaction.guildId, userId);
        await interaction.update({
            content: `🗑️ **${result.deleted.length} personnage(s)** de <@${userId}> ont été supprimés définitivement.`,
            embeds: [], components: [require("../../pages/staff/StaffCharactersPage").navigationRow()]
        });
        return true;
    }

    if (
        interaction.customId.startsWith("v2_staff_characters_archive:")
        || interaction.customId.startsWith("v2_staff_characters_restore:")
    ) {
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!hasStrictCharacterAccess(interaction, true)) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const manager = require("../../managers/CharacterRosterV2Manager");
        const userId = interaction.customId.split(":")[1];
        const archive = interaction.customId.includes("_archive:");
        const result = archive
            ? manager.archiveOwnerCharacters(interaction.guildId, userId)
            : manager.restoreOwnerCharacters(interaction.guildId, userId);
        await interaction.update({
            content: `✅ ${result.updated.length} personnage(s) ${archive ? "archivé(s)" : "restauré(s)"} pour <@${userId}>.`,
            embeds: [],
            components: [require("../../pages/staff/StaffCharactersPage").navigationRow()]
        });
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_scenes_")) {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const administrativeAccess = require("../../core/services/AdministrativePermissionAccessService");
        const { replyError } = require("../../core/services/InteractionResponseService");
        const action = interaction.customId.slice("v2_staff_scenes_".length);
        const readOnlyActions = ["manage", "diagnostic", "public_places", "duo_report"].includes(action);
        const allowed = readOnlyActions
            ? administrativeAccess.canRead(interaction, "scenes")
            : administrativeAccess.canWrite(interaction, "scenes");
        if (!allowed) {
            await replyError(
                interaction,
                readOnlyActions
                    ? "Tu n’as pas accès aux cycles de scènes."
                    : "Tu disposes uniquement d'un accès en lecture."
            );
            return true;
        }
        const manager = require("../../managers/SceneAssistantV2Manager");
        const page = require("../../pages/staff/StaffScenesPage");
        if (action === "toggle") {
            const current = manager.getConfiguration(interaction.guildId);
            if (Number(current?.is_enabled) === 1) {
                manager.disable(interaction.guildId);
            } else {
                manager.configure({
                    guildId: interaction.guildId,
                    durationDays: current?.duration_days || 8,
                    recommendedMessageCount: current?.recommended_message_count || 100,
                    inactivityHours: current?.inactivity_hours || 48
                });
            }
            await interaction.update(page.build(interaction));
            return true;
        }

        if (action === "manage") {
            await interaction.update(page.buildManagement(interaction));
            return true;
        }

        if (action === "diagnostic") {
            await interaction.update(page.buildDiagnostic(interaction));
            return true;
        }

        if (action === "public_places") {
            const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType } = require("discord.js");
            await interaction.update({
                content: "Choisis le forum Discord dont tu veux générer la liste des lieux publics.",
                embeds: [],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId("v2_staff_scenes_public_forum_select")
                            .setPlaceholder("Choisir le forum des lieux publics")
                            .setChannelTypes(ChannelType.GuildForum)
                    ),
                    page.build(interaction).components.at(-1)
                ]
            });
            return true;
        }

        if (action === "duo_report") {
            try {
                await interaction.deferUpdate();
                const report = await require("../../services/greyfate/GreyFateIntegrationService")
                    .buildLatestEventReport(interaction.guildId);
                await interaction.editReply(page.buildDuoReport(interaction, report));
            } catch (error) {
                await replyError(interaction, error);
            }
            return true;
        }

        if (action === "new_cycle") {
            try {
                require("../../services/scenes/SceneAssistantService").startNewCycle({
                    guildId: interaction.guildId,
                    channel: interaction.channel
                });
            } catch (error) {
                await replyError(interaction, error);
                return true;
            }
            await interaction.update(page.buildDiagnostic(interaction));
            return true;
        }

        if (action === "add_zone") {
            const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType } = require("discord.js");
            await interaction.update({
                content: "Choisis le salon, le forum ou la catégorie RP à suivre.",
                embeds: [],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId("v2_staff_scenes_zone_select")
                            .setPlaceholder("Choisir une zone RP")
                            .setChannelTypes(
                                ChannelType.GuildText,
                                ChannelType.GuildForum,
                                ChannelType.GuildCategory
                            )
                    ),
                    page.build(interaction).components.at(-1)
                ]
            });
            return true;
        }

        if (action === "add_current_category") {
            let current = interaction.channel;
            let category = null;
            while (current) {
                if (current.type === require("discord.js").ChannelType.GuildCategory) {
                    category = current;
                    break;
                }
                current = current.parent || null;
            }
            if (!category) {
                await replyError(interaction, "Ce salon n'est placé dans aucune catégorie Discord.");
                return true;
            }
            manager.addScope({
                guildId: interaction.guildId,
                channelId: category.id,
                createdBy: interaction.user.id
            });
            await interaction.update(page.build(interaction));
            return true;
        }

        if (action === "configure" || action === "add_expression") {
            const {
                ModalBuilder, TextInputBuilder, TextInputStyle,
                ActionRowBuilder
            } = require("discord.js");
            const configuration = manager.getConfiguration(interaction.guildId);
            const modal = new ModalBuilder()
                .setCustomId(
                    action === "configure"
                        ? "v2_staff_scenes_config_submit"
                        : "v2_staff_scenes_expression_submit"
                )
                .setTitle(
                    action === "configure"
                        ? "Configurer les scènes"
                        : "Expression de rattrapage"
                );
            if (action === "add_expression") {
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("expression")
                        .setLabel("Expression à reconnaître")
                        .setPlaceholder("Ex. On passe en privé ?")
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(100)
                        .setRequired(true)
                ));
            } else {
                modal.addComponents(
                    inputRow("duration_days", "Durée recommandée en jours (facultatif)", configuration?.duration_days),
                    inputRow("message_count", "Messages recommandés (facultatif)", configuration?.recommended_message_count),
                    inputRow("inactivity_hours", "Inactivité avant clôture (heures)", configuration?.inactivity_hours || 48, true)
                );
            }
            await interaction.showModal(modal);
            return true;
        }
    }

    if (interaction.customId.startsWith("v2_staff_public_places_refresh:")) {
        if (!require("../../core/services/AdministrativePermissionAccessService").canWrite(interaction, "scenes")) {
            await require("../../core/services/InteractionResponseService").replyError(interaction, "Tu n’as pas accès aux cycles de scènes.");
            return true;
        }
        await interaction.deferUpdate();
        const forumId = interaction.customId.split(":")[1];
        const forum = await interaction.guild.channels.fetch(forumId);
        const places = await require("../../services/publicPlaces/PublicPlaceForumService")
            .synchronize(interaction.guildId, forum);
        await interaction.editReply(
            require("../../views/staff/StaffPublicPlacesView").build(interaction, forum, places)
        );
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_public_places_page:")) {
        if (!require("../../core/services/AdministrativePermissionAccessService").canRead(interaction, "scenes")) {
            await require("../../core/services/InteractionResponseService").replyError(interaction, "Tu n’as pas accès aux cycles de scènes.");
            return true;
        }
        const [, forumId, rawPage] = interaction.customId.split(":");
        const forum = await interaction.guild.channels.fetch(forumId);
        const places = require("../../services/publicPlaces/PublicPlaceForumService")
            .get(interaction.guildId, forumId);
        await interaction.update(
            require("../../views/staff/StaffPublicPlacesView").build(interaction, forum, places, null, Number(rawPage) || 0)
        );
        return true;
    }

    if (interaction.customId !== "staff_close") return false;

    await interaction.update({
        content: "✅ Centre d'administration fermé.",
        embeds: [],
        components: []
    });
    return true;
};

function hasStrictCharacterAccess(interaction, write) {
    return hasStrictAccess(interaction, "characters", write);
}

function hasStrictAccess(interaction, permission, write) {
    return require("../../core/services/StaffPermissionDecisionService").decide({
        interaction,
        permission,
        write
    }).allowed;
}

function inputRow(customId, label, value, required = false) {
    const { ActionRowBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
    const input = new TextInputBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(TextInputStyle.Short)
        .setRequired(required);
    if (value != null && String(value)) input.setValue(String(value));
    return new ActionRowBuilder().addComponents(input);
}
