const {
    SlashCommandBuilder
} = require("discord.js");

const v2 =
    require("../../v2");

const libraryView =
    require(
        "../../v2/views/library/LibraryView"
    );

const {
    replyPrivate
} = require(
    "../../v2/core/services/InteractionResponseService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mes")
        .setDescription(
            "Accède à tes contenus GreyCore."
        )
        .addSubcommand(sub =>
            sub
                .setName("personnages")
                .setDescription(
                    "Affiche uniquement tes personnages."
                )
        ),

    async execute(interaction) {
        if (
            interaction.options.getSubcommand()
            !== "personnages"
        ) {
            return;
        }

        const user =
            v2.managers.user
                .getOrCreate(
                    interaction.user.id
                );

        const characters =
            v2.managers.library
                .getCharacters(
                    user.id
                );

        return replyPrivate(
            interaction,
            libraryView.build(characters)
        );
    }
};
