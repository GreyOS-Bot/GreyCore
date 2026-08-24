const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class CharacterCreateTypeView {

    build() {

        const embed =
            new EmbedBuilder()
                .setColor("#2B2D31")
                .setTitle(
                    "➕ Nouveau personnage"
                )
                .setDescription([
                    "Choisis le type de personnage à créer.",
                    "",
                    "Les PJ, PJ masqués, animaux et PNJ personnels ont une fiche complète. Les Random et personnages réservés demandent seulement un prénom et un avatar, qui devra être validé par le staff."
                ].join("\n"));

        const typesRow =
            new ActionRowBuilder()
                .addComponents(
                    this.createTypeButton(
                        "personnage_joue",
                        "Personnage joué",
                        "👤",
                        ButtonStyle.Primary
                    ),
                    this.createTypeButton(
                        "pnj",
                        "PNJ",
                        "🎭"
                    ),
                    this.createTypeButton(
                        "random",
                        "Random",
                        "🎲"
                    ),
                    this.createTypeButton("pj_masque", "PJ masqué", "🥷"),
                    this.createTypeButton("animal", "Animal", "🐾")
                );

        const specialTypesRow = new ActionRowBuilder()
            .addComponents(
                this.createTypeButton("pnj_reserve", "PNJ réservé", "🔒"),
                this.createTypeButton("reserve_staff", "Réservé staff", "🛡️")
            );

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "v2_library_open"
                        )
                        .setLabel(
                            "Retour"
                        )
                        .setEmoji(
                            "⬅️"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        return {
            embeds: [embed],
            components: [
                typesRow,
                specialTypesRow,
                navigationRow
            ]
        };

    }

    createTypeButton(
        type,
        label,
        emoji,
        style = ButtonStyle.Secondary
    ) {

        return new ButtonBuilder()
            .setCustomId(
                `v2_character_create_type:${type}`
            )
            .setLabel(label)
            .setEmoji(emoji)
            .setStyle(style);

    }

}

module.exports =
    new CharacterCreateTypeView();
