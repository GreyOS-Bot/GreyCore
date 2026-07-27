const characterManager = require("../managers/CharacterManager");

module.exports = async (interaction) => {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    const characters = characterManager.getCharactersByGuild(
        interaction.guild.id
    );

    const filtered = characters
        .filter(character =>
            character.name.toLowerCase().includes(focusedValue)
        )
        .slice(0, 25);

    return interaction.respond(
        filtered.map(character => ({
            name: character.name,
            value: character.id
        }))
    );
};