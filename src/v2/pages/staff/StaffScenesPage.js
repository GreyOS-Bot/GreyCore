const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const manager = require("../../managers/SceneAssistantV2Manager");

class StaffScenesPage {
    build(interaction) {
        const configuration = manager.getConfiguration(interaction.guildId);
        const enabled = Number(configuration?.is_enabled) === 1;
        const scopes = manager.getScopes(interaction.guildId);
        const expressions = manager.getTriggerExpressions(interaction.guildId);
        const scenes = manager.getActiveScenes(interaction.guildId);

        return {
            embeds: [new EmbedBuilder()
                .setColor(enabled ? 0x57F287 : 0x99AAB5)
                .setTitle("🎬 Administration des cycles de scènes")
                .setDescription([
                    `Assistant : **${enabled ? "activé ✅" : "désactivé ❌"}**`,
                    `Zones RP : **${scopes.length}**`,
                    `Scènes actives : **${scenes.length}**`,
                    `Expressions : ${expressions.map(item => `**${item.expression}**`).join(", ")}`
                ].join("\n"))
                .addFields(
                    {
                        name: "Seuils recommandés",
                        value: [
                            `Durée : ${configuration?.duration_days ? `${configuration.duration_days} jour(s)` : "non suivie"}`,
                            `Messages : ${configuration?.recommended_message_count || "non suivis"}`,
                            `Inactivité : ${configuration?.inactivity_hours || 48} heure(s)`
                        ].join("\n"),
                        inline: true
                    },
                    {
                        name: "Scènes en cours",
                        value: scenes.length
                            ? scenes.slice(0, 10).map(scene =>
                                `• **${scene.title}** · ${scene.rp_message_count} message(s)`
                            ).join("\n")
                            : "Aucune scène active.",
                        inline: false
                    }
                )],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("v2_staff_scenes_configure")
                        .setLabel("Configurer les seuils")
                        .setEmoji("⚙️")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("v2_staff_scenes_toggle")
                        .setLabel(enabled ? "Désactiver" : "Activer")
                        .setEmoji(enabled ? "⏸️" : "▶️")
                        .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId("v2_staff_scenes_add_expression")
                        .setLabel("Ajouter une expression")
                        .setEmoji("🔄")
                        .setStyle(ButtonStyle.Secondary)
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("v2_staff_scenes_add_zone")
                        .setLabel("Ajouter une zone")
                        .setEmoji("🗺️")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("v2_staff_scenes_add_current_category")
                        .setLabel("Ajouter cette catégorie")
                        .setEmoji("📂")
                        .setStyle(ButtonStyle.Secondary)
                ),
                navigationRow()
            ]
        };
    }

    execute(interaction) {
        return interaction.update(this.build(interaction));
    }
}

function navigationRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("page:staff:home:root")
            .setLabel("Accueil").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("staff_close")
            .setLabel("Fermer").setEmoji("❌").setStyle(ButtonStyle.Secondary)
    );
}

module.exports = new StaffScenesPage();
