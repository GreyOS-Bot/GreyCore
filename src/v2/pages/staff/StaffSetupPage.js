const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const settings = require("../../managers/GuildSettingsV2Manager");
const modules = require("../../managers/GuildModuleV2Manager");
const relationshipTypes = require("../../repositories/RelationshipTypeRepository");
const stateTypes = require("../../managers/StateTypeV2Manager");
const scenes = require("../../managers/SceneAssistantV2Manager");
const permissionPolicy = require("../../core/policies/StaffPermissionPolicy");
const { navigationRow } = require("./StaffCharactersPage");

class StaffSetupPage {
    build(interaction) {
        const guildId = interaction.guildId;
        const validationChannel = settings.getValidationChannelId(guildId);
        const logChannel = settings.getErrorLogChannelId(guildId);
        const configuredModules = modules.getAll(guildId);
        const relations = relationshipTypes.getByGuild(guildId);
        const states = stateTypes.getStateTypesByGuild(guildId);
        const sceneConfig = scenes.getConfiguration(guildId);
        const sceneScopes = scenes.getScopes(guildId);
        const sceneReady = Number(sceneConfig?.is_enabled) === 1 && sceneScopes.length > 0;
        const requiredReady = Boolean(validationChannel && logChannel && relations.length && states.length);

        const line = (ready, label, detail, optional = false) =>
            `${ready ? "✅" : optional ? "▫️" : "⚠️"} **${label}${optional ? " (facultatif)" : ""}**\n${detail}`;

        const secondaryActions = [sectionButton("scenes", "Scènes", "🎬")];
        if (permissionPolicy.canManagePermissions(interaction)) {
            secondaryActions.push(
                new ButtonBuilder()
                    .setCustomId("page:staff:section:permissions")
                    .setLabel("Permissions du staff")
                    .setEmoji("🔐")
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        return {
            embeds: [new EmbedBuilder()
                .setColor(requiredReady ? 0x57F287 : 0xFEE75C)
                .setTitle("🧭 Démarrage de GreyCore")
                .setDescription([
                    "Cette checklist permet de préparer le serveur sans mémoriser de commandes.",
                    "Les réglages facultatifs peuvent être ignorés sans bloquer les joueurs.",
                    "",
                    line(Boolean(validationChannel), "Validation des personnages",
                        validationChannel ? `Demandes envoyées dans <#${validationChannel}>.` : "Choisis ou crée le salon privé utilisé par le staff."),
                    "",
                    line(Boolean(logChannel), "Journaux de maintenance",
                        logChannel ? `Alertes envoyées dans <#${logChannel}>.` : "Configure le salon qui recevra les erreurs détaillées."),
                    "",
                    line(configuredModules.length > 0, "Outils RP",
                        configuredModules.length ? `${configuredModules.length} module(s) enregistré(s) pour ce serveur.` : "Vérifie les modules à proposer aux joueurs."),
                    "",
                    line(relations.length > 0, "Types de relations",
                        relations.length ? `${relations.length} type(s) disponible(s).` : "Installe les relations par défaut ou crée celles de ton univers."),
                    "",
                    line(states.length > 0, "Types d’états",
                        states.length ? `${states.length} état(s) disponible(s).` : "Installe les états par défaut ou crée tes propres états."),
                    "",
                    line(sceneReady, "Assistant de scènes",
                        sceneReady ? `${sceneScopes.length} zone(s) RP suivie(s).` : "Active l’assistant puis ajoute les catégories ou salons RP concernés.", true),
                    "",
                    requiredReady
                        ? "✅ **La configuration essentielle est prête pour la bêta.**"
                        : "⚠️ Termine les éléments essentiels signalés avant d’ouvrir largement GreyCore."
                ].join("\n"))
                .setFooter({ text: "GreyCore · Configuration Discord First" })],
            components: [
                new ActionRowBuilder().addComponents(
                    sectionButton("settings", "Validation", "📋"),
                    sectionButton("logs", "Journaux", "📜"),
                    sectionButton("modules", "Modules", "🧩"),
                    sectionButton("relationships", "Relations", "🎭"),
                    sectionButton("universe", "États", "🌍")
                ),
                new ActionRowBuilder().addComponents(...secondaryActions),
                navigationRow()
            ]
        };
    }

    execute(interaction) {
        return interaction.update(this.build(interaction));
    }
}

function sectionButton(key, label, emoji) {
    return new ButtonBuilder()
        .setCustomId(`page:staff:section:${key}`)
        .setLabel(label)
        .setEmoji(emoji)
        .setStyle(ButtonStyle.Secondary);
}

module.exports = new StaffSetupPage();
