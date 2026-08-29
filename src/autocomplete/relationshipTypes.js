const relationshipTypeManager =
    require("../managers/RelationshipTypeManager");

module.exports = async (interaction) => {
    const focusedValue = interaction.options
        .getFocused()
        .toLowerCase();

    const filtered =
        relationshipTypeManager.searchRelationshipTypes(
            interaction.guild.id,
            focusedValue,
            25
        );

    return interaction.respond(
        filtered.map(type => ({
            name: `${type.label_a_to_b} / ${type.label_b_to_a}`,
            value: String(type.id)
        }))
    );
};
