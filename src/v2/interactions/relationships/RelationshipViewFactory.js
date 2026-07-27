const {
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const {
    getCharacterDisplayName
} = require("./RelationshipUtils");

function createSearchResults({
    characterId,
    query,
    availableCharacters
}) {
    const select =
        new StringSelectMenuBuilder()
            .setCustomId(
                `v2_relationship_character:${characterId}`
            )
            .setPlaceholder(
                "Choisir un personnage"
            )
            .addOptions(
                availableCharacters.map(
                    entry => ({
                        label:
                            String(
                                getCharacterDisplayName(
                                    entry.character
                                )
                            ).slice(
                                0,
                                100
                            ),
                        description:
                            entry.continuity.name
                                ? `Continuité : ${
                                    String(
                                        entry.continuity.name
                                    ).slice(
                                        0,
                                        80
                                    )
                                }`
                                : "Continuité installée",
                        value:
                            String(
                                entry.characterId
                            )
                    })
                )
            );

    return {
        content:
            `🔎 **Résultats pour « ${query} »**\n`
            + "Les personnages sont classés par ordre alphabétique.",
        components: [
            new ActionRowBuilder()
                .addComponents(
                    select
                ),
            new ActionRowBuilder()
                .addComponents(
                    UI.button.secondary({
                        id:
                            `page:character:relationships:${characterId}`,
                        label:
                            "Retour",
                        emoji:
                            "⬅️"
                    }),
                    UI.components.navigation.close()
                )
        ]
    };
}

function createTypeSelection({
    characterId,
    otherCharacterId,
    relationshipTypes
}) {
    const select =
        new StringSelectMenuBuilder()
            .setCustomId(
                `v2_relationship_type:${characterId}`
            )
            .setPlaceholder(
                "Choisir le type de relation"
            )
            .addOptions(
                relationshipTypes
                    .slice(0, 25)
                    .map(type => ({
                        label:
                            String(
                                type.label_a_to_b
                            ).slice(0, 100),
                        description:
                            type.is_symmetric
                                ? "Relation réciproque"
                                : String(
                                    type.label_b_to_a
                                ).slice(0, 100),
                        value:
                            `${otherCharacterId}:${type.id}`,
                        emoji:
                            "❤️"
                    }))
            );

    return {
        content:
            "❤️ **Ajouter une relation**\n"
            + "Choisis maintenant le type de relation.",
        embeds:
            [],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    select
                ),
            new ActionRowBuilder()
                .addComponents(
                    UI.button.secondary({
                        id:
                            `v2_relationship_add:${characterId}`,
                        label:
                            "Retour",
                        emoji:
                            "⬅️"
                    }),
                    UI.components.navigation.close()
                )
        ]
    };
}

function createMissingTypeInformation(
    characterId
) {
    return {
        content: [
            "⚠️ **Les relations ne sont pas encore configurées sur ce serveur.**",
            "",
            "Un membre du staff doit utiliser `/installer-relations` une seule fois pour ajouter les types de relation par défaut.",
            "Les types peuvent ensuite être personnalisés avec `/relationtype creer`.",
            "",
            "Reviens ensuite ici pour créer cette relation."
        ].join("\n"),
        embeds: [],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    UI.button.secondary({
                        id:
                            `page:character:relationships:${characterId}`,
                        label:
                            "Retour",
                        emoji:
                            "⬅️"
                    }),
                    UI.components.navigation.close()
                )
        ]
    };
}

function createManageSelection({
    characterId,
    relationships
}) {
    const select =
        new StringSelectMenuBuilder()
            .setCustomId(
                `v2_relationship_manage_select:${characterId}`
            )
            .setPlaceholder(
                "Choisir une relation"
            )
            .addOptions(
                relationships
                    .slice(0, 25)
                    .map(relationship => ({
                        label:
                            String(
                                relationship.otherCharacterName
                                || "Personnage"
                            ).slice(0, 100),
                        description:
                            String(
                                relationship.displayLabel
                                || "Relation"
                            ).slice(0, 100),
                        value:
                            String(
                                relationship.id
                            ),
                        emoji:
                            "❤️"
                    }))
            );

    return {
        content:
            "⚙️ **Gérer une relation**\n"
            + "Choisis la relation à modifier ou supprimer.",
        embeds:
            [],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    select
                ),
            new ActionRowBuilder()
                .addComponents(
                    UI.button.secondary({
                        id:
                            `page:character:relationships:${characterId}`,
                        label:
                            "Retour",
                        emoji:
                            "⬅️"
                    }),
                    UI.components.navigation.close()
                )
        ]
    };
}

function createDetailsPage({
    characterId,
    relationshipId,
    dashboardData,
    relationship
}) {
    const embed =
        UI.embed.create({
            thumbnail:
                dashboardData
                    .character
                    .avatar_url
                || null,
            description:
                UI.components
                    .characterHeader
                    .build(
                        dashboardData.character
                    )
        });

    const fields = [
        {
            name:
                `❤️ ${relationship.displayLabel}`,
            value:
                `**${relationship.otherCharacterName}**`
        }
    ];

    if (relationship.started_at) {
        fields.push({
            name:
                "📅 Depuis",
            value:
                String(
                    relationship.started_at
                ).slice(0, 10),
            inline:
                true
        });
    }

    if (relationship.note) {
        fields.push({
            name:
                "📝 Description",
            value:
                relationship.note
        });
    }

    embed.addFields(
        ...fields
    );

    return UI.page.create({
        embed,
        components: [
            new ActionRowBuilder()
                .addComponents(
                    UI.button.primary({
                        id:
                            `v2_relationship_edit:${characterId}:${relationshipId}`,
                        label:
                            "Modifier les détails",
                        emoji:
                            "✏️"
                    }),
                    UI.button.danger({
                        id:
                            `v2_relationship_delete:${characterId}:${relationshipId}`,
                        label:
                            "Supprimer",
                        emoji:
                            "🗑️"
                    })
                ),
            new ActionRowBuilder()
                .addComponents(
                    UI.button.secondary({
                        id:
                            `v2_relationship_manage:${characterId}`,
                        label:
                            "Retour",
                        emoji:
                            "⬅️"
                    }),
                    UI.components.navigation.close()
                )
        ]
    });
}

function createDeleteConfirmation({
    characterId,
    relationshipId,
    relationship
}) {
    return {
        content:
            "⚠️ **Supprimer cette relation ?**\n\n"
            + `❤️ ${relationship.character_a_name}`
            + ` — ${relationship.character_b_name}\n\n`
            + "Cette action est irréversible.",
        embeds:
            [],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    UI.button.danger({
                        id:
                            `v2_relationship_delete_confirm:${characterId}:${relationshipId}`,
                        label:
                            "Supprimer",
                        emoji:
                            "🗑️"
                    }),
                    UI.button.secondary({
                        id:
                            `v2_relationship_details:${characterId}:${relationshipId}`,
                        label:
                            "Annuler",
                        emoji:
                            "❌"
                    })
                )
        ]
    };
}

module.exports = {
    createSearchResults,
    createTypeSelection,
    createMissingTypeInformation,
    createManageSelection,
    createDetailsPage,
    createDeleteConfirmation
};
