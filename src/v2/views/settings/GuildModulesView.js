const {
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const UI = require("../../framework");

function build(modules) {
    const lines = modules.map(module =>
        `${module.isEnabled ? "✅" : "⬛"} ${module.emoji} **${module.label}**\n-# ${module.description}`
    );

    const embed = UI.embed.create({
        title: "⚙️ Modules GreyCore",
        description: [
            "Active ou désactive les fonctionnalités du serveur.",
            "Désactiver un module masque ses accès sans supprimer les données déjà enregistrées.",
            "",
            lines.join("\n\n")
        ].join("\n")
    });

    const select = new StringSelectMenuBuilder()
        .setCustomId("v2_config_modules_toggle")
        .setPlaceholder("Activer ou désactiver un module")
        .addOptions(
            modules.map(module => ({
                label: `${module.isEnabled ? "Désactiver" : "Activer"} : ${module.label}`,
                description: module.description.slice(0, 100),
                value: module.key,
                emoji: module.emoji
            }))
        );

    return {
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents(select)
        ]
    };
}

module.exports = {
    build
};
