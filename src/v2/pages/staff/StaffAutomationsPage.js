const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType
} = require("discord.js");
const approvalManager = require("../../managers/CharacterApprovalAutomationV2Manager");
const settingsManager = require("../../managers/GuildSettingsV2Manager");
const { navigationRow } = require("./StaffCharactersPage");

class StaffAutomationsPage {
    build(interaction) {
        const approval = approvalManager.getConfiguration(interaction.guildId);
        const approvalEnabled = Number(approval?.is_enabled) === 1;
        const limit = settingsManager.getPlayedCharacterCreationLimit(interaction.guildId);
        const approvalDetails = approvalEnabled ? [
            `Seuil : **${approval.approved_character_count} personnage(s) validé(s)**`,
            `Rôle vérifié : ${mentionRole(approval.required_role_id)}`,
            `Rôle retiré : ${mentionRole(approval.remove_role_id)}`,
            `Rôle ajouté : ${mentionRole(approval.add_role_id)}`,
            `Salon d’accueil : ${approval.welcome_channel_id ? `<#${approval.welcome_channel_id}>` : "aucun"}`
        ].join("\n") : "Désactivée ou non configurée.";

        return {
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("🤖 Administration des automatisations")
                .addFields(
                    { name: "Accueil après validation", value: approvalDetails },
                    {
                        name: "Limite de création des PJ",
                        value: limit.enabled
                            ? `**${limit.limitCount} PJ** tous les **${limit.windowDays} jours** ✅`
                            : "Désactivée ❌"
                    }
                )],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("v2_staff_automations_configure_approval")
                    .setLabel("Configurer l’accueil")
                    .setEmoji("👋")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("v2_staff_automations_creation_limit")
                    .setLabel("Configurer la limite PJ")
                    .setEmoji("⏱️")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("v2_staff_automations_toggle_limit")
                    .setLabel(limit.enabled ? "Désactiver la limite" : "Activer la limite")
                    .setStyle(limit.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("v2_staff_automations_disable_approval")
                    .setLabel("Désactiver l’accueil")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!approvalEnabled)
            ), navigationRow()]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }

    buildApprovalConfiguration(interaction, draft) {
        return {
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("👋 Accueil après validation")
                .setDescription([
                    "Choisis les rôles et le salon utilisés par l’automatisation.",
                    "Tous les choix sont facultatifs, mais au moins une action devra être configurée.",
                    "",
                    `Rôle à vérifier : ${mentionRole(draft.requiredRoleId)}`,
                    `Rôle à retirer : ${mentionRole(draft.removeRoleId)}`,
                    `Rôle à ajouter : ${mentionRole(draft.addRoleId)}`,
                    `Salon d’accueil : ${draft.welcomeChannelId ? `<#${draft.welcomeChannelId}>` : "aucun"}`
                ].join("\n"))],
            components: [
                roleRow("v2_staff_automations_required_role", "Rôle que le membre doit posséder", draft.requiredRoleId),
                roleRow("v2_staff_automations_remove_role", "Rôle à retirer", draft.removeRoleId),
                roleRow("v2_staff_automations_add_role", "Rôle à ajouter", draft.addRoleId),
                channelRow(draft.welcomeChannelId),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("v2_staff_automations_approval_details")
                        .setLabel("Seuil et message").setEmoji("✏️").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("v2_staff_automations_cancel_approval")
                        .setLabel("Annuler").setStyle(ButtonStyle.Secondary)
                )
            ]
        };
    }
}

function mentionRole(roleId) { return roleId ? `<@&${roleId}>` : "aucun"; }

function roleRow(customId, placeholder, roleId) {
    const select = new RoleSelectMenuBuilder()
        .setCustomId(customId).setPlaceholder(placeholder).setMinValues(0).setMaxValues(1);
    if (roleId) select.setDefaultRoles(roleId);
    return new ActionRowBuilder().addComponents(select);
}

function channelRow(channelId) {
    const select = new ChannelSelectMenuBuilder()
        .setCustomId("v2_staff_automations_welcome_channel")
        .setPlaceholder("Salon du message de bienvenue")
        .setChannelTypes(ChannelType.GuildText).setMinValues(0).setMaxValues(1);
    if (channelId) select.setDefaultChannels(channelId);
    return new ActionRowBuilder().addComponents(select);
}

module.exports = new StaffAutomationsPage();
