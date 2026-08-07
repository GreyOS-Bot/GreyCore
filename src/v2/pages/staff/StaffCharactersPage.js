const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const rosterManager = require("../../managers/CharacterRosterV2Manager");
const validationManager = require("../../services/validation/ValidationManagerV2");
const guildSettingsManager = require("../../managers/GuildSettingsV2Manager");

class StaffCharactersPage {
    build(interaction) {
        const roster = rosterManager.getRoster(
            interaction.guildId,
            { includeArchived: true }
        );
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
                .setCustomId("v2_staff_characters_roster")
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
                .setStyle(ButtonStyle.Secondary)
        )];
        if (validationChannelId) {
            rows.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel("Ouvrir le salon de validation")
                    .setEmoji("📨")
                    .setURL(
                        `https://discord.com/channels/${interaction.guildId}/${validationChannelId}`
                    )
                    .setStyle(ButtonStyle.Link)
            ));
        }
        rows.push(navigationRow());

        return {
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("👥 Administration des personnages")
                .setDescription("Validations, listes et gestion des personnages du serveur.")
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
