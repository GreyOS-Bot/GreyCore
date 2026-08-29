const characterManager = require("../managers/CharacterManager");

module.exports = async (interaction) => {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    const characters =
        characterManager
            .searchCharactersByGuild(
                interaction.guild.id,
                focusedValue,
                25
            );

    return interaction.respond(
        characters.map(character => ({
            name: character.name,
            value: character.id
        }))
    );
};
