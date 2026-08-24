const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const characterTypes = require(
    "../../core/character/CharacterTypeCatalog"
);

class StaffCharacterCorrectionView {
    build(character) {
        const empty = value =>
            value === null
            || value === undefined
            || value === ""
                ? "—"
                : String(value);

        const embed = new EmbedBuilder()
            .setColor("#FEE75C")
            .setTitle(
                `🛠️ Correction staff — ${character.alias || character.firstname || character.proxy_name}`
            )
            .setDescription([
                `**Propriétaire :** <@${character.discord_user_id}>`,
                `**Statut :** ${character.status}`,
                `**Type :** ${characterTypes.getDisplayLabel(character.character_type)}`,
                ...(character.character_type === "pj_masque"
                    ? [`**PJ principal lié :** ${character.masked_parent_proxy_name || "Non relié"}`]
                    : []),
                "",
                `**Proxy :** ${empty(character.proxy_name)}`,
                `**Alias affiché :** ${empty(character.alias)}`,
                `**Vrai prénom :** ${empty(character.firstname)}`,
                `**Nom :** ${empty(character.lastname)}`,
                `**Âge :** ${empty(character.age)}`,
                `**Organisation :** ${empty(character.gang)}`,
                `**Métier :** ${empty(character.occupation)}`,
                "",
                "Choisis uniquement la partie à corriger."
            ].join("\n"));

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        `v2_staff_character_identity:${character.id}`
                    )
                    .setLabel("Modifier l’identité")
                    .setEmoji("✏️")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(
                        `v2_staff_character_info:${character.id}`
                    )
                    .setLabel("Modifier les informations")
                    .setEmoji("📝")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(
                        `v2_validation_request_change:${character.installation_id}`
                    )
                    .setLabel("Demander une modification")
                    .setEmoji("📨")
                    .setStyle(ButtonStyle.Secondary),
                ...(character.character_type === "pj_masque" ? [
                    new ButtonBuilder()
                        .setCustomId(`v2_staff_character_masked_link:${character.id}`)
                        .setLabel("Changer le PJ lié")
                        .setEmoji("🔗")
                        .setStyle(ButtonStyle.Secondary)
                ] : []),                new ButtonBuilder()
                    .setCustomId(`v2_staff_character_delete:${character.id}`)
                    .setLabel("Supprimer")
                    .setEmoji("🗑️")
                    .setStyle(ButtonStyle.Danger)
            );

        const typeSelect = new StringSelectMenuBuilder()
            .setCustomId(
                `v2_staff_character_type:${character.id}`
            )
            .setPlaceholder("Corriger le type du personnage")
            .addOptions(
                Object.entries(
                    characterTypes.CHARACTER_TYPES
                ).map(([value, definition]) => ({
                    label: definition.label,
                    value,
                    default:
                        value === character.character_type
                }))
            );

        return {
            embeds: [embed],
            components: [
                buttons,
                new ActionRowBuilder()
                    .addComponents(typeSelect),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("page:staff:characters:root")
                        .setLabel("Retour aux personnages").setEmoji("⬅️").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("staff_close")
                        .setLabel("Fermer").setEmoji("❌").setStyle(ButtonStyle.Secondary)
                )
            ]
        };
    }
}

module.exports =
    new StaffCharacterCorrectionView();
