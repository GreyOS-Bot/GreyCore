const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, StringSelectMenuBuilder } = require("discord.js");
const settingsManager = require("../../managers/GuildSettingsV2Manager");
const { navigationRow } = require("./StaffCharactersPage");

class StaffSettingsPage {
    build(interaction) {
        const validationChannelId = settingsManager.getValidationChannelId(interaction.guildId);
        const maintenance = settingsManager.getMaintenance(interaction.guildId);
        return {
            embeds: [new EmbedBuilder()
                .setColor(maintenance.enabled ? 0xFEE75C : 0x5865F2)
                .setTitle("⚙️ Paramètres généraux GreyCore")
                .addFields(
                    {
                        name: "Salon de validation",
                        value: validationChannelId ? `<#${validationChannelId}> ✅` : "Non configuré ❌",
                        inline: true
                    },
                    {
                        name: "Maintenance",
                        value: maintenance.enabled ? `Active 🛠️\n${maintenance.message}` : "Désactivée ✅",
                        inline: true
                    },
                    {
                        name: "Confidentialité et charte",
                        value: "Les utilisateurs peuvent consulter `/confidentialite politique`, `/confidentialite charte`, leurs données et demander leur anonymisation depuis Discord."
                    }
                )],
            components: [new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("v2_staff_settings_validation_channel")
                    .setPlaceholder("Choisir le salon de validation")
                    .setChannelTypes(ChannelType.GuildText)
            ), new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("v2_staff_settings_remove_validation")
                    .setLabel("Retirer le salon de validation")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!validationChannelId),
                new ButtonBuilder()
                    .setCustomId("v2_staff_settings_create_validation")
                    .setLabel("Créer un salon privé")
                    .setEmoji("📋")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("v2_staff_settings_maintenance_message")
                    .setLabel("Message de maintenance")
                    .setEmoji("✏️")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId("v2_staff_settings_toggle_maintenance")
                    .setLabel(maintenance.enabled ? "Désactiver la maintenance" : "Activer la maintenance")
                    .setStyle(maintenance.enabled ? ButtonStyle.Success : ButtonStyle.Danger)
            ), new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("v2_staff_settings_advanced")
                    .setLabel("Paramètres avancés")
                    .setEmoji("🧰")
                    .setStyle(ButtonStyle.Secondary)
            ), navigationRow()]
        };
    }

    buildAdvanced(interaction, requestedPage = 0) {
        const settings = require("../../managers/GuildAdvancedSettingV2Manager")
            .getAll(interaction.guildId);
        const pageSize = 20;
        const pageCount = Math.max(1, Math.ceil(settings.length / pageSize));
        const page = Math.max(0, Math.min(Number(requestedPage) || 0, pageCount - 1));
        const displayed = settings.slice(page * pageSize, (page + 1) * pageSize);
        const lines = displayed.map(setting =>
            `• **${escapeMarkdown(setting.setting_key)}** = \`${escapeCode(setting.setting_value)}\``
        );
        const components = [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("v2_staff_settings_advanced_set")
                .setLabel("Ajouter ou modifier")
                .setEmoji("✏️")
                .setStyle(ButtonStyle.Primary)
        )];
        if (displayed.length) {
            components.push(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`v2_staff_settings_advanced_remove:${page}`)
                    .setPlaceholder("Supprimer un paramètre")
                    .addOptions(displayed.map(setting => ({
                        label: setting.setting_key.slice(0, 100),
                        value: setting.setting_key,
                        description: String(setting.setting_value || "Valeur vide").slice(0, 100)
                    })))
            ));
        }
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`v2_staff_settings_advanced_page:${page - 1}`)
                .setLabel("Précédent")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`v2_staff_settings_advanced_page:${page + 1}`)
                .setLabel("Suivant")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= pageCount - 1),
            new ButtonBuilder()
                .setCustomId("page:staff:settings:root")
                .setLabel("Retour aux paramètres")
                .setStyle(ButtonStyle.Secondary)
        ));
        components.push(navigationRow());
        return {
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("🧰 Paramètres avancés")
                .setDescription([
                    "Ces clés servent aux réglages personnalisés historiques de ce serveur.",
                    "Les fonctions principales se configurent depuis les pages dédiées de `/staff`.",
                    "",
                    ...(lines.length ? lines : ["Aucun paramètre personnalisé."])
                ].join("\n").slice(0, 3900))
                .setFooter({ text: `Page ${page + 1}/${pageCount} · ${settings.length} paramètre(s)` })],
            components
        };
    }

    execute(interaction) { return interaction.update(this.build(interaction)); }
}

module.exports = new StaffSettingsPage();

function escapeCode(value) {
    return String(value ?? "").replace(/`/g, "ʼ").slice(0, 500);
}

function escapeMarkdown(value) {
    return String(value ?? "").replace(/([\\*_~|])/g, "\\$1");
}
