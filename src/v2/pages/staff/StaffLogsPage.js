const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require("discord.js");
const settingsManager = require("../../managers/GuildSettingsV2Manager");
const { navigationRow } = require("./StaffCharactersPage");

class StaffLogsPage {
    build(interaction) {
        const channelId = settingsManager.getErrorLogChannelId(interaction.guildId);
        return {
            embeds: [new EmbedBuilder()
                .setColor(channelId ? 0x57F287 : 0xED4245)
                .setTitle("📜 Journaux et alertes GreyCore")
                .setDescription([
                    `Salon actuel : ${channelId ? `<#${channelId}> ✅` : "**non configuré** ❌"}`,
                    "",
                    "GreyCore y envoie les erreurs détaillées avec l’action, le salon, le serveur, l’utilisateur et la trace technique nécessaires à la maintenance."
                ].join("\n"))],
            components: [new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("v2_staff_logs_channel")
                    .setPlaceholder("Choisir le salon des journaux")
                    .setChannelTypes(ChannelType.GuildText)
            ), new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("v2_staff_logs_test")
                    .setLabel("Envoyer une alerte de test")
                    .setEmoji("🧪")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!channelId),
                new ButtonBuilder()
                    .setCustomId("v2_staff_logs_remove_channel")
                    .setLabel("Retirer le salon")
                    .setEmoji("🗑️")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!channelId)
            ), navigationRow()]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }
}

module.exports = new StaffLogsPage();
