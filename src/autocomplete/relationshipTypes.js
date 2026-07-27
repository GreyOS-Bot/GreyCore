const relationshipTypeManager =
    require("../managers/RelationshipTypeManager");

module.exports = async (interaction) => {
    const focusedValue = interaction.options
        .getFocused()
        .toLowerCase();

    const types = relationshipTypeManager.getTypesByGuild(
        interaction.guild.id
    );

    const filtered = types
        .filter(type =>
            type.label_a_to_b
                .toLowerCase()
                .includes(focusedValue) ||
            type.label_b_to_a
                .toLowerCase()
                .includes(focusedValue) ||
            type.key
                .toLowerCase()
                .includes(focusedValue)
        )
        .slice(0, 25);

    return interaction.respond(
        filtered.map(type => ({
            name: `${type.label_a_to_b} / ${type.label_b_to_a}`,
            value: String(type.id)
        }))
    );
};