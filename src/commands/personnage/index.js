const db = require("../../database/database");
const v2 =
    require("../../v2");

const libraryHomeView =
    require("../../v2/views/home/LibraryHomeView");

const openCharacterDashboardPage =
    require(
        "../../v2/pages/character/OpenCharacterDashboardPage"
    );    

const characterCreateModal =
    require(
        "../../v2/modals/CharacterCreateModal"
    );

const {
    privatePayload,
    replyPrivate
} = require(
    "../../v2/core/services/InteractionResponseService"
);

const {
    SlashCommandBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("personnage")
    .setDescription("Gère tes personnages.")

    .addSubcommand(sub =>
        sub
            .setName("creer")
            .setDescription("Crée un nouveau personnage.")

            .addStringOption(option =>
                option
                    .setName("type")
                    .setDescription("Type de personnage")
                    .setRequired(true)
                    .addChoices(
                        {
                            name: "Personnage joué",
                            value: "personnage_joue"
                        },
                        {
                            name: "PNJ",
                            value: "pnj"
                        },
                        {
                            name: "Random",
                            value: "random"
                        },
                        {
                            name: "PNJ réservé",
                            value: "pnj_reserve"
                        },
                        {
                            name: "Réservé staff",
                            value: "reserve_staff"
                        }
                    )
            )

            .addStringOption(option =>
                option
                    .setName("nom")
                    .setDescription(
                        "Nom utilisé pour écrire avec le personnage"
                    )
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(32)
            )
    )

    .addSubcommand(sub =>
    sub
        .setName("bibliotheque")
        .setDescription(
            "Ouvre ta bibliothèque de personnages."
        )
)

    .addSubcommand(sub =>
        sub
            .setName("fiche")
            .setDescription("Affiche la fiche d’un personnage.")
            .addStringOption(option =>
                option
                    .setName("nom")
                    .setDescription("Nom du personnage")
                    .setRequired(true)
            )
    ),

    async execute(interaction) {
        const subcommand =
            interaction.options.getSubcommand();

        /*
         * CRÉATION
         */
        if (subcommand === "creer") {
    const type =
        interaction.options.getString("type");

    const proxyName =
        interaction.options
            .getString("nom")
            .trim();

    return interaction.showModal(
        characterCreateModal.build(
            type,
            proxyName
        )
    );
}

        if (subcommand === "bibliotheque") {
    const user =
        v2.managers.user.getOrCreate(
            interaction.user.id
        );

    const statistics =
        v2.managers.library.getStatistics(
            user.id
        );

    const view =
        libraryHomeView.build(
            interaction.user,
            statistics
        );

    return replyPrivate(
        interaction,
        view
    );
}

               /*
         * FICHE V2
         */
        if (subcommand === "fiche") {

            const name =
                interaction.options
                    .getString("nom")
                    .trim();

            const v2Character =
                db.prepare(`
                    SELECT
                        character.id

                    FROM CharactersV2 character

                    JOIN CharacterGuildInstallationsV2 installation
                        ON installation.character_id =
                            character.id

                    WHERE installation.guild_id = ?
                    AND LOWER(character.proxy_name) =
                        LOWER(?)
                    AND character.is_archived = 0
                    AND installation.status = 'approved'
                    AND installation.proxy_enabled = 1

                    ORDER BY installation.id DESC

                    LIMIT 1
                `).get(
                    interaction.guildId,
                    name
                );

            if (!v2Character) {

                return replyPrivate(
                    interaction,
                    "❌ Aucun personnage jouable installé sur ce serveur n’a été trouvé avec ce nom."
                );

            }

            const pageInteraction =
                new Proxy(
                    interaction,
                    {
                        get(target, property) {

                            if (property === "update") {

                                return payload =>
                                    target.reply(
                                        privatePayload(
                                            target,
                                            payload
                                        )
                                    );

                            }

                            const value =
                                Reflect.get(
                                    target,
                                    property,
                                    target
                                );

                            return typeof value === "function"
                                ? value.bind(target)
                                : value;

                        }
                    }
                );

            return openCharacterDashboardPage.execute(
                pageInteraction,
                v2Character.id
            );

        }

    }

};
