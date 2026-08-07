const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const settings = require("../../managers/GuildSettingsV2Manager");
const modules = require("../../managers/GuildModuleV2Manager");
const permissions = require("../../managers/StaffPermissionV2Manager");
const approval = require("../../managers/CharacterApprovalAutomationV2Manager");
const relationships = require("../../repositories/RelationshipTypeRepository");
const states = require("../../managers/StateTypeV2Manager");
const scenes = require("../../managers/SceneAssistantV2Manager");
const entities = require("../../managers/NarrativeEntityV2Manager");
const permissionPolicy = require("../../core/policies/StaffPermissionPolicy");
const { navigationRow } = require("./StaffCharactersPage");

class StaffConfigurationOverviewPage {
    build(interaction) {
        const guildId = interaction.guildId;
        const validationChannel = settings.getValidationChannelId(guildId);
        const logChannel = settings.getErrorLogChannelId(guildId);
        const maintenance = settings.getMaintenance(guildId);
        const creationLimit = settings.getPlayedCharacterCreationLimit(guildId);
        const moduleConfig = modules.getConfiguration(guildId);
        const staff = permissions.getAssignments(guildId);
        const approvalConfig = approval.getConfiguration(guildId);
        const sceneConfig = scenes.getConfiguration(guildId);
        const scopes = scenes.getScopes(guildId);
        const expressions = scenes.getTriggerExpressions(guildId);
        const relationshipTypes = relationships.getByGuild(guildId);
        const stateTypeList = states.getStateTypesByGuild(guildId);
        const entityList = entities.getByGuild(guildId);

        const enabledModules = moduleConfig.filter(item => item.isEnabled);
        const disabledModules = moduleConfig.filter(item => !item.isEnabled);
        const approvalEnabled = Number(approvalConfig?.is_enabled) === 1;
        const sceneEnabled = Number(sceneConfig?.is_enabled) === 1;

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("📋 Configuration actuelle de GreyCore")
            .setDescription("Vue complète de ce qui est configuré sur ce serveur et de l’endroit où chaque fonction agit.")
            .addFields(
                {
                    name: "📍 Salons GreyCore",
                    value: [
                        `Validation : ${channel(validationChannel)}`,
                        `Journaux : ${channel(logChannel)}`
                    ].join("\n")
                },
                {
                    name: "🧩 Modules",
                    value: [
                        `✅ Activés : ${enabledModules.map(item => `${item.emoji} ${item.label}`).join(" · ") || "aucun"}`,
                        `❌ Désactivés : ${disabledModules.map(item => item.label).join(" · ") || "aucun"}`
                    ].join("\n")
                },
                {
                    name: "🎭 Référentiels RP",
                    value: [
                        `Relations : **${relationshipTypes.length} type(s)**`,
                        `États : **${stateTypeList.length} type(s)**`,
                        `Entités : **${entityList.length}** dont **${entityList.filter(entity => entity.is_enabled).length} active(s)**`
                    ].join("\n"),
                    inline: true
                },
                {
                    name: "🎬 Assistant de scènes",
                    value: [
                        `Statut : ${enabled(sceneEnabled)}`,
                        `Zones : ${summarize(scopes, item => `<#${item.channel_id}>`)}`,
                        `Expressions : ${summarize(expressions, item => item.expression)}`,
                        `Seuils : ${sceneConfig?.duration_days || "—"} jour(s) · ${sceneConfig?.recommended_message_count || "—"} message(s) · ${sceneConfig?.inactivity_hours || 48} h d’inactivité`
                    ].join("\n")
                },
                {
                    name: "🤖 Automatisations",
                    value: [
                        `Accueil après validation : ${enabled(approvalEnabled)}`,
                        approvalEnabled ? `Seuil : **${approvalConfig.approved_character_count}** personnage(s)` : null,
                        approvalEnabled ? `Rôle vérifié : ${role(approvalConfig.required_role_id)}` : null,
                        approvalEnabled ? `Rôle retiré : ${role(approvalConfig.remove_role_id)}` : null,
                        approvalEnabled ? `Rôle ajouté : ${role(approvalConfig.add_role_id)}` : null,
                        approvalEnabled ? `Message envoyé dans : ${channel(approvalConfig.welcome_channel_id)}` : null,
                        `Limite de création PJ : ${creationLimit.enabled ? `✅ ${creationLimit.limitCount} tous les ${creationLimit.windowDays} jours` : "❌ Désactivée"}`,
                        `Maintenance : ${maintenance.enabled ? "🛠️ Activée" : "✅ Désactivée"}`
                    ].filter(Boolean).join("\n")
                },
                {
                    name: "🔐 Accès du staff",
                    value: [
                        `Accès via le salon de validation : ${enabled(permissions.getValidationChannelAccess(guildId))}`,
                        `Rôles configurés : ${summarize(staff.roles, item => `<@&${item.role_id}>`)}`,
                        `Utilisateurs configurés : ${summarize(staff.users, item => `<@${item.discord_user_id}>`)}`,
                        "Le propriétaire du serveur et les administrateurs Discord conservent toujours l’accès complet."
                    ].join("\n")
                }
            )
            .setFooter({ text: "GreyCore · Configuration propre à ce serveur" })
            .setTimestamp();

        const generalButtons = [
            ["settings", "Paramètres", "⚙️"],
            ["logs", "Journaux", "📜"],
            ["modules", "Modules", "🧩"]
        ];
        if (permissionPolicy.canManagePermissions(interaction)) {
            generalButtons.push(["permissions", "Permissions", "🔐"]);
        }

        return {
            embeds: [embed],
            components: [
                row(...generalButtons),
                row(["relationships", "Relations", "🎭"], ["universe", "Univers", "🌍"], ["entities", "Entités", "✨"], ["scenes", "Scènes", "🎬"], ["automations", "Automatisations", "🤖"]),
                navigationRow()
            ]
        };
    }

    execute(interaction) {
        return interaction.update(this.build(interaction));
    }
}

function channel(id) { return id ? `<#${id}> ✅` : "Non configuré ❌"; }
function role(id) { return id ? `<@&${id}>` : "aucun"; }
function enabled(value) { return value ? "✅ Activé" : "❌ Désactivé"; }
function summarize(items, formatter) {
    if (!items.length) return "aucun";
    const shown = items.slice(0, 10).map(formatter).join(", ");
    return items.length > 10 ? `${shown} · +${items.length - 10}` : shown;
}
function row(...items) {
    return new ActionRowBuilder().addComponents(...items.map(([key, label, emoji]) =>
        new ButtonBuilder()
            .setCustomId(`page:staff:section:${key}`)
            .setLabel(label)
            .setEmoji(emoji)
            .setStyle(ButtonStyle.Secondary)
    ));
}

module.exports = new StaffConfigurationOverviewPage();
