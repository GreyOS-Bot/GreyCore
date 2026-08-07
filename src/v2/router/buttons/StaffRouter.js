module.exports = async interaction => {
    if (!interaction.isButton?.()) return false;
    if (!interaction.customId) return false;

    if (interaction.customId.startsWith("v2_staff_domain_toggle:")) {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        const moduleManager = require("../../managers/GuildModuleV2Manager");
        const moduleKey = interaction.customId.split(":")[1];
        const permissionKey = moduleKey === "assets" ? "bank" : moduleKey;
        if (!policy.canAccess(interaction, permissionKey, { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        moduleManager.setEnabled(
            interaction.guildId,
            moduleKey,
            !moduleManager.isEnabled(interaction.guildId, moduleKey)
        );
        const pages = {
            phone: "StaffPhonePage",
            assets: "StaffBankPage",
            relationships: "StaffRelationshipsPage"
        };
        await interaction.update(require(`../../pages/staff/${pages[moduleKey]}`).build(interaction));
        return true;
    }

    if (interaction.customId === "v2_staff_bank_install_defaults") {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canAccess(interaction, "bank", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        require("../../managers/AssetTypeV2Manager").ensureDefaults(interaction.guildId);
        await interaction.update(require("../../pages/staff/StaffBankPage").build(interaction));
        return true;
    }

    if (interaction.customId === "v2_staff_universe_install_states") {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canAccess(interaction, "universe", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        require("../../managers/StateTypeV2Manager")
            .installDefaultStateTypes(interaction.guildId, interaction.user.id);
        await interaction.update(require("../../pages/staff/StaffUniversePage").build(interaction));
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_automations_")) {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canAccess(interaction, "automations", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const action = interaction.customId.slice("v2_staff_automations_".length);
        const settings = require("../../managers/GuildSettingsV2Manager");
        const page = require("../../pages/staff/StaffAutomationsPage");
        const drafts = require("../../services/automation/ApprovalAutomationDraftService");
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
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canAccess(interaction, "logs", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        require("../../managers/GuildSettingsV2Manager").removeErrorLogChannel(interaction.guildId);
        await interaction.update(require("../../pages/staff/StaffLogsPage").build(interaction));
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_settings_")) {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canAccess(interaction, "settings", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const action = interaction.customId.slice("v2_staff_settings_".length);
        const settings = require("../../managers/GuildSettingsV2Manager");
        const page = require("../../pages/staff/StaffSettingsPage");
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

    if (interaction.customId === "v2_staff_characters_roster") {
        const { EmbedBuilder } = require("discord.js");
        const manager = require("../../managers/CharacterRosterV2Manager");
        const roster = manager.getRoster(interaction.guildId, {
            includeArchived: true
        });
        const lines = roster.slice(0, 60).map(character =>
            `${character.is_archived ? "📦" : "✅"} **${character.firstname || character.proxy_name}** — <@${character.discord_user_id}>`
        );
        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("👥 Personnages du serveur")
                .setDescription(lines.join("\n").slice(0, 3900) || "Aucun personnage installé.")
                .setFooter({ text: `${roster.length} personnage(s) au total` })],
            components: [require("../../pages/staff/StaffCharactersPage").navigationRow()]
        });
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

    if (
        interaction.customId.startsWith("v2_staff_characters_archive:")
        || interaction.customId.startsWith("v2_staff_characters_restore:")
    ) {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canAccess(interaction, "characters", { write: true })) {
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
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canAccess(interaction, "scenes", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }

        const action = interaction.customId.slice("v2_staff_scenes_".length);
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

    if (interaction.customId !== "staff_close") return false;

    await interaction.update({
        content: "✅ Centre d'administration fermé.",
        embeds: [],
        components: []
    });
    return true;
};

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
