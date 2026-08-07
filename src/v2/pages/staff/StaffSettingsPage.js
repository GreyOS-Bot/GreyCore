const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require("discord.js");
const settingsManager = require("../../managers/GuildSettingsV2Manager");
const { navigationRow } = require("./StaffCharactersPage");

class StaffSettingsPage {
    build(interaction) {
        const validationChannelId = settingsManager.getValidationChannelId(interaction.guildId);
        const maintenance = settingsManager.getMaintenance(interaction.guildId);
        return {
            embeds: [new EmbedBuilder()
                .setColor(maintenance.enabled ? 0xFEE75C : 0x5865F2)
                .setTitle("⚙️ Paramètres généraux GreyCore")
                .addFields(
                    {
                        name: "Salon de validation",
                        value: validationChannelId ? `<#${validationChannelId}> ✅` : "Non configuré ❌",
                        inline: true
                    },
                    {
                        name: "Maintenance",
                        value: maintenance.enabled ? `Active 🛠️\n${maintenance.message}` : "Désactivée ✅",
                        inline: true
                    },
                    {
                        name: "Confidentialité et charte",
                        value: "Les utilisateurs peuvent consulter `/confidentialite politique`, `/confidentialite charte`, leurs données et demander leur anonymisation depuis Discord."
                    }
                )],
            components: [new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("v2_staff_settings_validation_channel")
                    .setPlaceholder("Choisir le salon de validation")
                    .setChannelTypes(ChannelType.GuildText)
            ), new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("v2_staff_settings_remove_validation")
                    .setLabel("Retirer le salon de validation")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!validationChannelId),
                new ButtonBuilder()
                    .setCustomId("v2_staff_settings_maintenance_message")
                    .setLabel("Message de maintenance")
                    .setEmoji("✏️")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("v2_staff_settings_toggle_maintenance")
                    .setLabel(maintenance.enabled ? "Désactiver la maintenance" : "Activer la maintenance")
                    .setStyle(maintenance.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
            ), navigationRow()]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }
}

module.exports = new StaffSettingsPage();
