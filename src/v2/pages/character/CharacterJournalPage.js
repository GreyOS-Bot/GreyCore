const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

class CharacterJournalPage {

    async execute(
        interaction,
        characterId
    ) {

        const dashboardData =
            characterDashboardManager
                .getDashboardData(
                    characterId,
                    {
                        guildId:
                            interaction.guildId
                    }
                );

        if (!dashboardData) {

            return interaction.update({

                content:
                    "❌ Ce personnage est introuvable.",

                embeds:
                    [],

                components:
                    []

            });

        }

        const character =
            dashboardData.character;

        const headerCharacter = {

            ...character,

            display_name:
                character.proxy_name
                || character.display_name
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

        const embed =
            UI.embed.create({

                title:
                    null,

                thumbnail:
                    character.avatar_url
                    || null,

                description:
                    UI.text.blocks([

                        UI.components
                            .characterHeader
                            .build(
                                headerCharacter
                            ),

                        "### 📖 Journal",

                        "Le journal du personnage sera disponible prochainement."

                    ])

            });

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.secondary({

                        id:
                            `page:character:category:character:${characterId}`,

                        label:
                            "Personnage",

                        emoji:
                            "⬅️"

                    }),

                    UI.components
                        .navigation
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

}

module.exports =
    new CharacterJournalPage();
