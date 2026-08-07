const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const manager = require("../../managers/GuildModuleV2Manager");
const { navigationRow } = require("./StaffCharactersPage");

class StaffModulesPage {
    build(interaction) {
        const modules = manager.getConfiguration(interaction.guildId);
        return {
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("🧩 Modules GreyCore")
                .setDescription([
                    "Active ou désactive les fonctionnalités de ce serveur.",
                    "Les données enregistrées sont conservées lorsqu’un module est désactivé.",
                    "",
                    ...modules.map(module =>
                        `${module.isEnabled ? "✅" : "⬛"} ${module.emoji} **${module.label}**\n-# ${module.description}`
                    )
                ].join("\n\n"))],
            components: [new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("v2_staff_modules_toggle")
                    .setPlaceholder("Activer ou désactiver un module")
                    .addOptions(modules.map(module => ({
                        label: `${module.isEnabled ? "Désactiver" : "Activer"} : ${module.label}`,
                        description: module.description.slice(0, 100),
                        value: module.key,
                        emoji: module.emoji
                    })))
            ), navigationRow()]
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }
}

module.exports = new StaffModulesPage();
