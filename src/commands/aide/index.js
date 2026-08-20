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
            "Ouvre le guide GreyCore (Aide application-like)."
        )
        .addStringOption(option =>
            option
                .setName("rubrique")
                .setDescription("Rubrique d’aide")
                .addChoices(
                    {
                        name: "Bien démarrer",
                        value: "demarrage"
                    },
                    {
                        name: "👤 Joueurs",
                        value: "player"
                    },
                    {
                        name: "👤 Gestion personnage",
                        value: "player_character"
                    },
                    {
                        name: "👥 Relations",
                        value: "player_relations"
                    },
                    {
                        name: "🩹 États",
                        value: "player_states"
                    },
                    {
                        name: "🎒 Banque / Biens",
                        value: "player_bank"
                    },
                    {
                        name: "📱 Téléphone",
                        value: "player_phone"
                    },
                    {
                        name: "🎬 Scènes",
                        value: "player_scenes"
                    },
                    {
                        name: "🛠️ Staff",
                        value: "staff"
                    },
                    {
                        name: "🔧 Paramétrage staff",
                        value: "staff_setup"
                    },
                    {
                        name: "🏦 Banque",
                        value: "staff_bank"
                    },
                    {
                        name: "📱 Téléphone (staff)",
                        value: "staff_phone"
                    },
                    {
                        name: "📦 Modules",
                        value: "staff_modules"
                    },
                    {
                        name: "✨ Entités",
                        value: "staff_entities"
                    },
                    {
                        name: "🔁 Automatisations",
                        value: "staff_automations"
                    },
                    {
                        name:
                            "🎬 Cycles de scènes",
                        value:
                            "staff_scenes"
                    },
                    {
                        name: "🔐 Permissions",
                        value: "staff_permissions"
                    },
                    {
                        name: "🤖 Greybot",
                        value: "staff_greybot"
                    },
                    {
                        name: "📖 Documentation",
                        value: "documentation"
                    },
                    {
                        name: "❓ FAQ",
                        value: "docs_faq"
                    },
                    {
                        name: "📚 Guides",
                        value: "docs_guides"
                    },
                    {
                        name: "🗒️ Notes de version",
                        value: "docs_changelog"
                    },
                    {
                        name: "🔐 Confidentialité",
                        value: "docs_privacy"
                    }
                )
        ),

    async execute(interaction) {
        const topic =
            interaction.options.getString(
                "rubrique"
            )
            || "demarrage";
        const legacy = {
            personnages: "player_character",
            relations: "player_relations",
            etats: "player_states",
            banque: "player_bank",
            telephone: "player_phone",
            bank: "player_bank",
            biens: "player_bank",
            scenes: "player_scenes",
            confidentialite: "docs_privacy"
        };
        const resolvedTopic =
            legacy[topic]
            || topic;

        return replyPrivate(
            interaction,
            guideView.build(resolvedTopic)
        );
    }
};
