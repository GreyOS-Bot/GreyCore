const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const catalog = require("../../core/permissions/StaffPermissionCatalog");
const policy = require("../../core/policies/StaffPermissionPolicy");

const SECTIONS = catalog.all().filter(item => item.key !== "read_only");

class StaffCenterPage {
    build(interaction) {
        const visible = SECTIONS.filter(section =>
            policy.canAccess(interaction, section.key)
        );

        if (policy.canManagePermissions(interaction)) {
            visible.push({
                key: "permissions",
                label: "Permissions",
                emoji: "🔐"
            });
        }

        if (policy.canAccess(interaction, "settings")) {
            visible.unshift({
                key: "setup",
                label: "Démarrage",
                emoji: "🧭"
            });
            visible.unshift({
                key: "overview",
                label: "Configuration",
                emoji: "📋"
            });
        }

        const buttons = visible.map(section =>
            new ButtonBuilder()
                .setCustomId(`page:staff:section:${section.key}`)
                .setLabel(section.label)
                .setEmoji(section.emoji)
                .setStyle(ButtonStyle.Secondary)
        );
        const rows = [];
        for (let index = 0; index < buttons.length; index += 5) {
            rows.push(
                new ActionRowBuilder().addComponents(
                    buttons.slice(index, index + 5)
                )
            );
        }
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("staff_close")
                .setLabel("Fermer")
                .setEmoji("❌")
                .setStyle(ButtonStyle.Secondary)
        ));

        return {
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("⚙️ Centre d'administration GreyCore")
                .setDescription([
                    "Configure ton serveur depuis une interface unique.",
                    "Les catégories affichées correspondent à tes autorisations GreyCore."
                ].join("\n\n"))
                .setFooter({
                    text: "GreyCore · Administration Discord First"
                })],
            components: rows
        };
    }

    execute(interaction) {
        return interaction.update(this.build(interaction));
    }
}

module.exports = new StaffCenterPage();
