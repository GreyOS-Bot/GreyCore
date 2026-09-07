const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");
const rosterManager = require("../../managers/CharacterRosterV2Manager");
const validationManager = require("../../services/validation/ValidationManagerV2");
const guildSettingsManager = require("../../managers/GuildSettingsV2Manager");

class StaffCharactersPage {
    build(interaction, contextId = null, contextPage = 0) {
        const installationManager = require("../../managers/InstallationV2Manager");
        let context;
        let contexts;
        try {
            context = installationManager.resolveContext(interaction.guildId, contextId);
            contexts = require("../../services/contexts").contexts.listByGuild(interaction.guildId)
                .filter(item => item.is_active);
        } catch {
            context = { id: null, name: "Guild-wide" };
            contexts = [];
        }
        const lastPage = Math.max(0, Math.ceil(contexts.length / 25) - 1);
        contextPage = Math.max(0, Math.min(lastPage, Number(contextPage) || 0));
        const token = require("../../services/contexts/CharacterContextSelectionService").create({
            guildId: interaction.guildId, userId: interaction.user?.id || "legacy-ui",
            contextId: context.id, page: contextPage
        });
        const roster = context.id && typeof rosterManager.getRosterByContext === "function"
            ? rosterManager.getRosterByContext(interaction.guildId, context.id, { includeArchived: true })
            : rosterManager.getRoster(interaction.guildId, { includeArchived: true });
        const active = roster.filter(character => !character.is_archived);
        const archived = roster.filter(character => character.is_archived);
        const pending = validationManager.getPendingForGuild(interaction.guildId);
        const validationChannelId = guildSettingsManager
            .getValidationChannelId(interaction.guildId);

        const rows = [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("v2_staff_characters_pending")
                .setLabel(`Validations · ${pending.length}`)
                .setEmoji("📋")
                .setStyle(pending.length ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`v3_staff_character:roster:${token}`)
                .setLabel("Liste des personnages")
                .setEmoji("👥")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("v2_staff_characters_users")
                .setLabel("Gérer un utilisateur")
                .setEmoji("🛠️")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("v2_staff_characters_deploy_all")
                .setLabel("Déployer l’existant")
                .setEmoji("🚀")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("v2_staff_characters_cancel_installation")
                .setLabel("Annuler une installation")
                .setEmoji("🧹")
                .setStyle(ButtonStyle.Danger)
        )];
        if (contexts.length) rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("v2_staff_characters_statistics_global")
                .setLabel("Statistiques globales")
                .setEmoji("📊")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("v2_staff_characters_statistics_user")
                .setLabel("Statistiques par utilisateur")
                .setEmoji("👤")
                .setStyle(ButtonStyle.Secondary)
        ));
        rows.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`v3_staff_character:select:${token}`)
                .setPlaceholder(`Context — page ${contextPage + 1}/${lastPage + 1}`)
                .addOptions(contexts.slice(contextPage * 25, contextPage * 25 + 25).map(item => ({
                    label: item.name.slice(0, 100), value: item.id, default: item.id === context.id
                })))
        ));
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("v2_staff_characters_genders")
                .setLabel("Genres des personnages")
                .setEmoji("👥")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("v2_staff_character_gender_quick:0")
                .setLabel("Saisie rapide des genres")
                .setEmoji("⚡")
                .setStyle(ButtonStyle.Success)
        ));
        if (validationChannelId) {
            rows[1].addComponents(
                new ButtonBuilder()
                    .setLabel("Ouvrir le salon de validation")
                    .setEmoji("📨")
                    .setURL(
                        `https://discord.com/channels/${interaction.guildId}/${validationChannelId}`
                    )
                    .setStyle(ButtonStyle.Link)
            );
        }
        rows.push(navigationRow().addComponents(
            new ButtonBuilder().setCustomId(`v3_staff_character:prev:${token}`)
                .setLabel("Contexts précédents").setStyle(ButtonStyle.Secondary).setDisabled(contextPage === 0),
            new ButtonBuilder().setCustomId(`v3_staff_character:next:${token}`)
                .setLabel("Contexts suivants").setStyle(ButtonStyle.Secondary).setDisabled(contextPage === lastPage)
        ));

        return {
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("👥 Administration des personnages")
                .setDescription(`Validations Guild-wide ; installations affichées dans **${context.name}**.`)
                .addFields(
                    { name: "Personnages actifs", value: String(active.length), inline: true },
                    { name: "Personnages archivés", value: String(archived.length), inline: true },
                    { name: "Validations en attente", value: String(pending.length), inline: true }
                )],
            components: rows
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

module.exports = new StaffCharactersPage();
module.exports.navigationRow = navigationRow;
