const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const characterManager =
    require(
        "../../managers/CharacterV2Manager"
    );

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

class CharacterDeletePage {

    async execute(
        interaction,
        characterId
    ) {

        const character =
            characterManager.getById(
                characterId
            );

        if (!character) {

            return this.showError(
                interaction,
                "❌ Ce personnage a déjà été supprimé ou n’existe plus."
            );

        }

        if (
            !characterManagementPolicy.isOwner(
                interaction,
                character
            )
        ) {

            return this.showError(
                interaction,
                "❌ Tu ne peux pas supprimer ce personnage."
            );

        }

        const result =
            characterManager.delete(
                character.id
            );

        const embed =
            UI.embed.create({

                title:
                    "✅ Personnage supprimé",

                thumbnail:
                    result.character
                        .avatar_url
                    || null,

                description:
                    `**${result.character.proxy_name}** et toutes ses données ont été supprimés définitivement de la bibliothèque.`

            });

        embed.addFields(
            {
                name:
                    "Continuités supprimées",
                value:
                    String(
                        result.continuityCount
                    ),
                inline:
                    true
            },
            {
                name:
                    "Installations supprimées",
                value:
                    String(
                        result.installationCount
                    ),
                inline:
                    true
            }
        );

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.components.navigation
                        .library(),

                    UI.components.navigation
                        .close()

                );

        return interaction.update(

            UI.page.create({

                embed,
                components: [
                    navigationRow
                ]

            })

        );

    }

    showError(
        interaction,
        content
    ) {

        return interaction.update({

            content,
            embeds: [],
            components: []

        });

    }

}

module.exports =
    new CharacterDeletePage();
