const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
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
                            ? scenes.slice(0, 10).map(scene => {
                                const channels = String(scene.channel_ids || "")
                                    .split(",")
                                    .filter(Boolean)
                                    .map(id => `<#${id}>`)
                                    .join(" → ") || "Lieu indisponible";
                                const started = Math.floor(
                                    new Date(scene.started_at).getTime() / 1000
                                );
                                return [
                                    `• **${scene.title}** · ${channels}`,
                                    `  Depuis <t:${started}:d> · ${formatSceneProgress(scene, configuration)}`
                                ].join("\n");
                            }).join("\n")
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
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("v2_staff_scenes_manage")
                        .setLabel("Gérer le suivi")
                        .setEmoji("🛠️")
                        .setStyle(ButtonStyle.Secondary)
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("v2_staff_scenes_diagnostic")
                        .setLabel("Diagnostic ici")
                        .setEmoji("🧪")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("v2_staff_scenes_new_cycle")
                        .setLabel("Nouveau cycle ici")
                        .setEmoji("🔄")
                        .setStyle(ButtonStyle.Primary)
                ),
                navigationRow()
            ]
        };
    }

    execute(interaction) {
        return interaction.update(this.build(interaction));
    }

    buildManagement(interaction) {
        const scopes = manager.getScopes(interaction.guildId);
        const expressions = manager.getTriggerExpressions(interaction.guildId);
        const components = [];
        if (scopes.length) {
            components.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("v2_staff_scenes_remove_zone")
                    .setPlaceholder("Retirer une zone RP")
                    .addOptions(scopes.slice(0, 25).map(scope => ({
                        label: interaction.guild?.channels?.cache?.get(scope.channel_id)?.name?.slice(0, 100)
                            || `Zone ${scope.channel_id}`.slice(0, 100),
                        value: String(scope.channel_id),
                        emoji: "🗺️"
                    })))
            ));
        }
        if (expressions.length) {
            components.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("v2_staff_scenes_remove_expression")
                    .setPlaceholder("Retirer une expression")
                    .addOptions(expressions.slice(0, 25).map(trigger => ({
                        label: trigger.expression.slice(0, 100),
                        value: trigger.normalized_expression.slice(0, 100),
                        emoji: "🔄"
                    })))
            ));
        }
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("page:staff:section:scenes")
                .setLabel("Retour aux scènes").setEmoji("⬅️").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("staff_close")
                .setLabel("Fermer").setEmoji("❌").setStyle(ButtonStyle.Secondary)
        ));
        return {
            embeds: [new EmbedBuilder().setColor(0x5865F2)
                .setTitle("🛠️ Zones et expressions")
                .addFields(
                    {
                        name: `Zones RP · ${scopes.length}`,
                        value: scopes.map(scope => `<#${scope.channel_id}>`).join("\n") || "Aucune zone configurée."
                    },
                    {
                        name: `Expressions · ${expressions.length}`,
                        value: expressions.map(trigger => `• ${trigger.expression}`).join("\n") || "Aucune expression configurée."
                    }
                )],
            components
        };
    }

    buildDiagnostic(interaction) {
        const configuration = manager.getConfiguration(interaction.guildId);
        const scopes = manager.getScopes(interaction.guildId);
        const channelIds = require("../../services/scenes/SceneAssistantService")
            .getChannelAndParentIds(interaction.channel, interaction.channelId);
        const matchedScope = scopes.find(scope => channelIds.includes(String(scope.channel_id)));
        const activeScene = manager.getActiveSceneByChannel(interaction.guildId, interaction.channelId);
        return {
            embeds: [new EmbedBuilder().setColor(matchedScope ? 0x57F287 : 0xFEE75C)
                .setTitle("🧪 Diagnostic des scènes")
                .addFields(
                    { name: "Assistant", value: Number(configuration?.is_enabled) === 1 ? "Activé ✅" : "Désactivé ❌", inline: true },
                    { name: "Salon reconnu", value: matchedScope ? `Oui, via <#${matchedScope.channel_id}> ✅` : "Non ❌", inline: true },
                    { name: "Scène active ici", value: activeScene ? `**${activeScene.title}** · ${activeScene.rp_message_count} message(s)` : "Aucune" },
                    { name: "Zones configurées", value: scopes.map(scope => `<#${scope.channel_id}>`).join(", ") || "Aucune" }
                )],
            components: [navigationRow()]
        };
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

function formatSceneProgress(scene, configuration, now = new Date()) {
    const startedAt = new Date(scene.started_at).getTime();
    const elapsedDays = Number.isFinite(startedAt)
        ? Math.max(1, Math.floor((now.getTime() - startedAt) / 86_400_000) + 1)
        : 1;
    const dayLimit = Number(configuration?.duration_days) || null;
    const messageCount = Number(scene.rp_message_count || 0);
    const messageLimit = Number(configuration?.recommended_message_count) || null;
    const parts = [
        `Jour **${elapsedDays}${dayLimit ? ` / ${dayLimit}` : ""}**`,
        `Messages **${messageCount}${messageLimit ? ` / ${messageLimit}` : ""}**`
    ];
    const overruns = [];
    if (dayLimit && elapsedDays > dayLimit) overruns.push(`+${elapsedDays - dayLimit} jour(s)`);
    if (messageLimit && messageCount > messageLimit) overruns.push(`+${messageCount - messageLimit} message(s)`);
    if (overruns.length) parts.push(`⚠️ Dépassement : **${overruns.join(" · ")}**`);
    return parts.join(" · ");
}

module.exports.formatSceneProgress = formatSceneProgress;
