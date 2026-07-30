const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const relationshipManager =
    require(
        "../../managers/RelationshipV2Manager"
    );

const familyTreeImageRenderer =
    require(
        "../../services/relationships/FamilyTreeImageRenderer"
    );

class CharacterFamilyTreePage {

    async execute(
        interaction,
        characterId
    ) {
        const dashboardData =
            characterDashboardManager.getDashboardData(
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
                embeds: [],
                components: []
            });
        }

        const {
            character,
            continuity
        } = dashboardData;

        const continuityId =
            continuity?.continuity_id
            || continuity?.id
            || null;

        const tree = continuityId
            ? relationshipManager.getFamilyTree(
                continuityId
            )
            : [];

        const navigationRow =
            new ActionRowBuilder()
                .addComponents(
                    UI.button.secondary({
                        id:
                            `page:character:relationships:${characterId}`,
                        label: "Relations",
                        emoji: "↩️"
                    }),
                    UI.components.navigation.close()
                );

        const embed =
            UI.embed.create({
                title: "🌳 Arbre généalogique",
                thumbnail:
                    character.avatar_url
                    || null,
                description: [
                    UI.components.characterHeader.build(
                        character
                    ),
                    "",
                    tree.length > 0
                        ? "Les liens familiaux validés de cette continuité."
                        : "Aucun lien familial validé n’est encore enregistré pour ce personnage."
                ].join("\n")
            });

        if (tree.length > 0) {
            const filename =
                "greycore-arbre-genealogique.png";

            embed.setImage(
                `attachment://${filename}`
            );

            const image =
                familyTreeImageRenderer.render({
                    characterName:
                        continuity?.firstname
                        || character.base_firstname
                        || character.proxy_name,
                    tree
                });

            return interaction.update({
                embeds: [embed],
                components: [
                    navigationRow
                ],
                files: [
                    {
                        attachment: image,
                        name: filename
                    }
                ],
                attachments: []
            });
        }

        return interaction.update({
            ...UI.page.create({
                embed,
                components: [
                    navigationRow
                ]
            }),
            attachments: []
        });
    }

}

module.exports =
    new CharacterFamilyTreePage();
