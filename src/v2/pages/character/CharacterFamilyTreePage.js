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

        for (const group of tree) {
            embed.addFields({
                name: group.label,
                value: formatMembers(
                    group.members
                )
            });
        }

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

function formatMembers(members) {
    const content = members
        .map(member => {
            const label = member.label
                ? ` — ${member.label}`
                : "";
            const note = member.note
                ? `\n> ${member.note}`
                : "";

            return `• **${member.name}**${label}${note}`;
        })
        .join("\n");

    return truncate(
        content,
        1_024
    );
}

function truncate(value, maximum) {
    return value.length > maximum
        ? `${value.slice(0, maximum - 1)}…`
        : value;
}

module.exports =
    new CharacterFamilyTreePage();
