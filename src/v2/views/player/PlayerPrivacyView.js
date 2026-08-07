const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function build() {
    return {
        embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🔐 Confidentialité et mes données")
            .setDescription([
                "Consulte les engagements de GreyCore et les informations rattachées à ton compte.",
                "",
                "L’oubli anonymise ton identité Discord sans supprimer tes personnages ni leurs contenus RP. Cette action sensible reste protégée par une confirmation explicite."
            ].join("\n"))],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("v2_player_privacy_policy").setLabel("Politique").setEmoji("🔐").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("v2_player_privacy_charter").setLabel("Charte").setEmoji("📜").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("v2_player_privacy_summary").setLabel("Mes données").setEmoji("🧾").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("v2_player_privacy_forget").setLabel("Droit à l’oubli").setEmoji("🫥").setStyle(ButtonStyle.Danger)
        ), new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("v2_library_home").setLabel("Accueil").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("character_close").setLabel("Fermer").setEmoji("❌").setStyle(ButtonStyle.Secondary)
        )]
    };
}

function buildForgetConfirmation() {
    return {
        embeds: [new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("⚠️ Confirmer le droit à l’oubli")
            .setDescription([
                "Cette action retire définitivement le lien entre ton compte Discord et les données conservées par GreyCore.",
                "",
                "Tes personnages et leurs contenus RP ne seront pas supprimés : ils deviendront anonymes et ne seront plus accessibles depuis ton compte.",
                "",
                "Cette action est irréversible. Confirme une seconde fois uniquement si tu souhaites réellement continuer."
            ].join("\n"))],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("v2_player_privacy_forget_confirm")
                .setLabel("Oui, anonymiser mes données")
                .setEmoji("⚠️")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("v2_player_privacy")
                .setLabel("Annuler")
                .setStyle(ButtonStyle.Secondary)
        )]
    };
}

module.exports = { build, buildForgetConfirmation };
