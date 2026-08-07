const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const statsRepository = require("../../repositories/StaffDomainStatsRepository");
const moduleManager = require("../../managers/GuildModuleV2Manager");
const { navigationRow } = require("./StaffCharactersPage");

class StaffPhonePage {
    build(interaction) {
        const stats = statsRepository.getPhoneStats(interaction.guildId);
        const enabled = moduleManager.isEnabled(interaction.guildId, "phone");
        return {
            embeds: [new EmbedBuilder()
                .setColor(enabled ? 0x57F287 : 0x99AAB5)
                .setTitle("📱 Administration du téléphone")
                .setDescription(`Module : **${enabled ? "activé ✅" : "désactivé ❌"}**`)
                .addFields(
                    { name: "Téléphones", value: `${stats.phones.active} actif(s) sur ${stats.phones.total}`, inline: true },
                    { name: "Conversations", value: `${stats.conversations.total} dont ${stats.conversations.groups} groupe(s)`, inline: true },
                    { name: "Messages", value: String(stats.messages.total), inline: true },
                    { name: "Appels", value: `${stats.calls.total} dont ${stats.calls.active} en cours`, inline: true }
                )],
            components: [toggleRow(enabled), navigationRow()]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }
}

function toggleRow(enabled) {
    return new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setCustomId("v2_staff_domain_toggle:phone")
        .setLabel(enabled ? "Désactiver le téléphone" : "Activer le téléphone")
        .setEmoji(enabled ? "⏸️" : "▶️")
        .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success));
}

module.exports = new StaffPhonePage();
