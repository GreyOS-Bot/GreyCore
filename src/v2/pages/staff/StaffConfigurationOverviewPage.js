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
const decisionService = require("../../core/services/StaffPermissionDecisionService");
const { navigationRow } = require("./StaffCharactersPage");
const READ_DOMAINS = ["settings", "modules", "relationships", "universe", "entities", "scenes", "automations", "logs"];
const NO_ACCESS = "Accès non autorisé.";

class StaffConfigurationOverviewPage {
    build(interaction) {
        const guildId = interaction.guildId;
        const { decisions } = decisionService.decideMany({
            interaction,
            requests: READ_DOMAINS.map(permission => ({ permission, write: false }))
        });
        const readable = Object.fromEntries(READ_DOMAINS.map((domain, index) => [domain, decisions[index].allowed]));
        if (!readable.settings) return { content: "❌ Accès non autorisé.", embeds: [], components: [] };
        const root = permissionPolicy.canManagePermissions(interaction);
        const validationChannel = settings.getValidationChannelId(guildId);
        const logChannel = readable.logs ? settings.getErrorLogChannelId(guildId) : null;
        const maintenance = settings.getMaintenance(guildId);
        const creationLimit = settings.getPlayedCharacterCreationLimit(guildId);
        const moduleConfig = readable.modules ? modules.getConfiguration(guildId) : [];
        const staff = root ? permissions.getAssignments(guildId) : null;
        const approvalConfig = readable.automations ? approval.getConfiguration(guildId) : null;
        const sceneConfig = readable.scenes ? scenes.getConfiguration(guildId) : null;
        const scopes = readable.scenes ? scenes.getScopes(guildId) : [];
        const expressions = readable.scenes ? scenes.getTriggerExpressions(guildId) : [];
        const relationshipTypes = readable.relationships ? relationships.getByGuild(guildId) : [];
        const stateTypeList = readable.universe ? states.getStateTypesByGuild(guildId) : [];
        const entityList = readable.entities ? entities.getByGuild(guildId) : [];

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
                        `Journaux : ${readable.logs ? channel(logChannel) : NO_ACCESS}`
                    ].join("\n")
                },
                {
                    name: "🧩 Modules",
                    value: readable.modules ? [
                        `✅ Activés : ${enabledModules.map(item => `${item.emoji} ${item.label}`).join(" · ") || "aucun"}`,
                        `❌ Désactivés : ${disabledModules.map(item => item.label).join(" · ") || "aucun"}`
                    ].join("\n") : NO_ACCESS
                },
                {
                    name: "🎭 Référentiels RP",
                    value: [
                        readable.relationships ? `Relations : **${relationshipTypes.length} type(s)**` : `Relations : ${NO_ACCESS}`,
                        readable.universe ? `États : **${stateTypeList.length} type(s)**` : `États : ${NO_ACCESS}`,
                        readable.entities ? `Entités : **${entityList.length}** dont **${entityList.filter(entity => entity.is_enabled).length} active(s)**` : `Entités : ${NO_ACCESS}`
                    ].join("\n"),
                    inline: true
                },
                {
                    name: "🎬 Assistant de scènes",
                    value: readable.scenes ? [
                        `Statut : ${enabled(sceneEnabled)}`,
                        `Zones : ${summarize(scopes, item => `<#${item.channel_id}>`)}`,
                        `Expressions : ${summarize(expressions, item => item.expression)}`,
                        `Seuils : ${sceneConfig?.duration_days || "—"} jour(s) · ${sceneConfig?.recommended_message_count || "—"} message(s) · ${sceneConfig?.inactivity_hours || 48} h d’inactivité`
                    ].join("\n") : NO_ACCESS
                },
                {
                    name: "🤖 Automatisations",
                    value: [
                        readable.automations ? `Accueil après validation : ${enabled(approvalEnabled)}` : `Accueil après validation : ${NO_ACCESS}`,
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
                    value: root ? [
                        `Accès via le salon de validation : ${enabled(permissions.getValidationChannelAccess(guildId))}`,
                        `Rôles configurés : ${summarize(staff.roles, item => `<@&${item.role_id}>`)}`,
                        `Utilisateurs configurés : ${summarize(staff.users, item => `<@${item.discord_user_id}>`)}`,
                        "Le propriétaire du serveur et les administrateurs Discord conservent toujours l’accès complet."
                    ].join("\n") : NO_ACCESS
                }
            )
            .setFooter({ text: "GreyCore · Configuration propre à ce serveur" })
            .setTimestamp();

        const generalButtons = [
            ["settings", "Paramètres", "⚙️"],
            ["logs", "Journaux", "📜"],
            ["modules", "Modules", "🧩"]
        ];
        if (root) {
            generalButtons.push(["permissions", "Permissions", "🔐"]);
        }

        return {
            embeds: [embed],
            components: [
                row(readable, ...generalButtons),
                row(readable, ["relationships", "Relations", "🎭"], ["universe", "Univers", "🌍"], ["entities", "Entités", "✨"], ["scenes", "Scènes", "🎬"], ["automations", "Automatisations", "🤖"]),
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
function row(readable, ...items) {
    return new ActionRowBuilder().addComponents(...items.map(([key, label, emoji]) =>
        new ButtonBuilder()
            .setCustomId(`page:staff:section:${key}`)
            .setLabel(label)
            .setEmoji(emoji)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(key !== "permissions" && !readable[key])
    ));
}

module.exports = new StaffConfigurationOverviewPage();
