const { ActionRowBuilder } = require("discord.js");

const UI = require("../../framework");

class CharacterCategoryPage {

    /**
     * Construit une page de catégorie.
     */
    build({
        character,
        title,
        description = null,
        rows = []
    }) {

        const characterId =
            character.id ??
            character.char_uuid;

        if (!characterId) {

            throw new Error(
                "CharacterCategoryPage : identifiant du personnage introuvable."
            );

        }

        const headerCharacter = {

            ...character,

            display_name:
                character.display_name
                || character.proxy_name
                || character.name
                || "Personnage",

            organization:
                character.organization_name
                || character.gang_name
                || character.organization
                || character.gang
                || null,

            age:
                character.age
                ?? character.base_age
                ?? null,

            character_type:
                character.character_type
                || character.characterType
                || character.type
                || (
                    character.is_npc
                        ? "pnj"
                        : "personnage_joue"
                )

        };

        const descriptionParts = [

            UI.components.characterHeader.build(
                headerCharacter
            ),

            `### ${title}`

        ];

        if (description) {

            descriptionParts.push(
                description
            );

        }

        const embed =
            UI.embed.create({

                title:
                    null,

                thumbnail:
                    character.avatar_url || null,

                description:
                    UI.text.blocks(
                        descriptionParts
                    )

            });

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.secondary({

    id:
    `page:character:home:${characterId}`,

    label:
        "Personnage",

    emoji:
        "⬅️"

}),

                    UI.components.navigation.home(),

                    UI.components.navigation.library(),

                    UI.components.navigation.close()

                );

        return UI.page.create({

            embed,

            components: [
                ...rows,
                navigationRow
            ]

        });

    }

}

module.exports =
    new CharacterCategoryPage();
