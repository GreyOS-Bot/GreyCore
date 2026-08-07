const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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
}

function mentionRole(roleId) { return roleId ? `<@&${roleId}>` : "aucun"; }

module.exports = new StaffAutomationsPage();
