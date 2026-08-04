const {
    SlashCommandBuilder
} = require("discord.js");

const guideView =
    require(
        "../../v2/views/help/GettingStartedGuideView"
    );

const {
    replyPrivate
} = require(
    "../../v2/core/services/InteractionResponseService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aide")
        .setDescription(
            "Ouvre le guide GreyCore et la documentation de démarrage."
        )
        .addStringOption(option =>
            option
                .setName("rubrique")
                .setDescription(
                    "Partie de la documentation à ouvrir"
                )
                .addChoices(
                    {
                        name:
                            "Bien démarrer",
                        value:
                            "demarrage"
                    },
                    {
                        name:
                            "Personnages",
                        value:
                            "personnages"
                    },
                    {
                        name:
                            "Relations",
                        value:
                            "relations"
                    },
                    {
                        name:
                            "États",
                        value:
                            "etats"
                    },
                    {
                        name:
                            "Téléphone",
                        value:
                            "telephone"
                    },
                    {
                        name:
                            "Biens",
                        value:
                            "biens"
                    },
                    {
                        name:
                            "Confidentialité et mes données",
                        value:
                            "confidentialite"
                    }
                )
        ),

    async execute(interaction) {
        const topic =
            interaction.options.getString(
                "rubrique"
            )
            || "demarrage";

        return replyPrivate(
            interaction,
            guideView.build(topic)
        );
    }
};
