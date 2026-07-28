const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

class CharacterAliasesPage {

    build(
        character,
        aliases
    ) {
        const aliasList = aliases.length
            ? aliases.map(
                alias =>
                    `\u2022 \`${alias.alias}\``
            ).join("\n")
            : "Aucun alias pour le moment.";

        const embed =
            new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(
                    `Alias de ${character.proxy_name}`
                )
                .setDescription([
                    "Un alias est un autre proxy pour ce m\u00eame personnage.",
                    "Exemple : `Al:` utilisera le personnage dont le proxy principal est `Alba:`.",
                    "",
                    aliasList
                ].join("\n"));

        const components = [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v2_aliases_add:${character.id}`
                        )
                        .setLabel(
                            "Ajouter un alias"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),
                    new ButtonBuilder()
                        .setCustomId(
                            `page:character:profile:${character.id}`
                        )
                        .setLabel("Retour \u00e0 la fiche")
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                )
        ];

        if (aliases.length) {
            components.push(
                new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(
                                `v2_aliases_remove_select:${character.id}`
                            )
                            .setPlaceholder(
                                "Supprimer un alias"
                            )
                            .addOptions(
                                aliases
                                    .slice(0, 25)
                                    .map(alias => ({
                                        label:
                                            alias.alias.slice(0, 100),
                                        value:
                                            String(alias.id)
                                    }))
                            )
                    )
            );
        }

        return {
            embeds: [embed],
            components
        };
    }

}

module.exports =
    new CharacterAliasesPage();
