const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const catalog = require("../../core/permissions/StaffPermissionCatalog");
const policy = require("../../core/policies/StaffPermissionPolicy");
const decisionService = require(
    "../../core/services/StaffPermissionDecisionService"
);

// La section Biens sera raccordée à sa page dédiée en 2C.4b. La permission
// reste dès maintenant administrable sans exposer une destination vide.
const SECTIONS = catalog.all().filter(
    item => !["assets", "read_only"].includes(item.key)
);
const SECTION_READ_REQUESTS = SECTIONS.map(section => Object.freeze({
    permission: section.key,
    write: false
}));

class StaffCenterPage {
    build(interaction) {
        const { decisions } = decisionService.decideMany({
            interaction,
            requests: SECTION_READ_REQUESTS,
            legacyCanAccessParity: true
        });
        const visible = SECTIONS.filter((_section, index) =>
            decisions[index].allowed
        );

        if (policy.canManagePermissions(interaction)) {
            visible.push({
                key: "permissions",
                label: "Permissions",
                emoji: "🔐"
            });
        }

        const settingsIndex = SECTIONS.findIndex(
            section => section.key === "settings"
        );
        if (decisions[settingsIndex].allowed) {
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
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("v2_help:staff")
                .setLabel("Aide")
                .setEmoji("❓")
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
