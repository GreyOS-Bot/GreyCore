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
    deferPrivate,
    replyPrivate
} = require(
    "../../v2/core/services/InteractionResponseService"
);

const {
    SlashCommandBuilder
} = require("discord.js");

const discordUserDisplayService =
    require(
        "../../v2/core/services/DiscordUserDisplayService"
    );

const characterPublicSearchRepository =
    require(
        "../../v2/repositories/CharacterPublicSearchRepository"
    );

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
                            name: "PJ masqué",
                            value: "pj_masque"
                        },
                        {
                            name: "Animal",
                            value: "animal"
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
            .setName("type")
            .setDescription("Modifie rapidement le type d’un personnage.")
            .addStringOption(option =>
                option
                    .setName("personnage")
                    .setDescription("Tape le prénom ou l’alias du personnage")
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option
                    .setName("nouveau_type")
                    .setDescription("Nouveau type du personnage")
                    .setRequired(true)
                    .addChoices(
                        { name: "Personnage joué", value: "personnage_joue" },
                        { name: "PJ masqué", value: "pj_masque" },
                        { name: "Animal", value: "animal" },
                        { name: "PNJ", value: "pnj" },
                        { name: "Random", value: "random" },
                        { name: "PNJ réservé", value: "pnj_reserve" },
                        { name: "Réservé staff", value: "reserve_staff" }
                    )
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
                    .setAutocomplete(true)
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

        if (subcommand === "type") {
            const characterId = interaction.options.getString("personnage", true);
            const newType = interaction.options.getString("nouveau_type", true);
            const service = require("../../v2/services/character/CharacterTypeCorrectionService");
            const isStaff = require("../../v2/core/services/StaffPermissionDecisionService")
                .decide({ interaction, permission: "characters", write: true })
                .allowed;
            let context;

            if (isStaff) {
                context = service.correctForStaff({
                    guildId: interaction.guildId,
                    characterId,
                    changes: { characterType: newType }
                });
            } else {
                if (!["animal", "pj_masque"].includes(newType)) {
                    return replyPrivate(interaction,
                        "❌ Seul le staff peut convertir un personnage en PJ, PNJ, Random ou personnage réservé.");
                }
                context = service.correct({
                    guildId: interaction.guildId,
                    discordUserId: interaction.user.id,
                    characterId,
                    changes: { characterType: newType }
                });
            }

            if (newType === "pj_masque") {
                const candidates = require("../../v2/managers/CharacterV2Manager")
                    .getByOwnerDiscordId(context.discord_user_id);
                return replyPrivate(interaction,
                    require("../../v2/views/character/MaskedCharacterLinkView").build(candidates, {
                        mode: "link",
                        maskedCharacterId: characterId,
                        staff: isStaff
                    }));
            }

            return replyPrivate(interaction,
                `✅ **${context.firstname || context.proxy_name}** est maintenant classé comme **${require("../../v2/core/character/CharacterTypeCatalog").getDisplayLabel(newType)}**.`);
        }

               /*
         * FICHE V2
         */
        if (subcommand === "fiche") {

            await deferPrivate(
                interaction
            );

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

                    LEFT JOIN CharacterProfilesV2 profile
                        ON profile.continuity_id =
                            installation.continuity_id

                    WHERE installation.guild_id = ?
                    AND (
                        character.id = ?
                        OR LOWER(character.proxy_name) =
                            LOWER(?)
                        OR LOWER(
                            TRIM(profile.alias)
                        ) = LOWER(?)
                    )
                    AND character.is_archived = 0
                    AND installation.status = 'approved'
                    AND installation.proxy_enabled = 1

                    ORDER BY installation.id DESC

                    LIMIT 1
                `).get(
                    interaction.guildId,
                    name,
                    name,
                    name
                );

            if (!v2Character) {

                return interaction.editReply({
                    content:
                        "❌ Aucun personnage jouable installé sur ce serveur n’a été trouvé avec ce nom."
                });

            }

            const pageInteraction =
                new Proxy(
                    interaction,
                    {
                        get(target, property) {

                            if (property === "update") {

                                return payload =>
                                    target.editReply(
                                        payload
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

    },

    async autocomplete(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if (!["fiche", "type"].includes(subcommand)) {
            return interaction.respond([]);
        }

        const focused = String(
            interaction.options.getFocused()
            || ""
        ).trim();

        let characters;
        if (subcommand === "type") {
            const isStaff = require("../../v2/core/services/StaffPermissionDecisionService")
                .decide({ interaction, permission: "characters", write: false })
                .allowed;
            characters = require("../../v2/services/character/CharacterTypeCorrectionService")
                .search(
                    interaction.guildId,
                    focused,
                    {
                        ownerDiscordUserId:
                            isStaff
                                ? null
                                : interaction.user.id
                    }
                );
            characters = characters.map(character => ({
                ...character,
                display_name: character.display_name || character.firstname || character.proxy_name
            }));
        } else {
            characters = characterPublicSearchRepository
                .searchInstalledByDisplayName(interaction.guildId, focused);
        }

        const ownerDisplays =
            await discordUserDisplayService
                .resolveMany(
                    interaction,
                    characters.map(
                        character =>
                            character.discord_user_id
                    )
                );

        return interaction.respond(
            characters.map(character => {
                const ownerName =
                    ownerDisplays.get(
                        String(
                            character.discord_user_id
                        )
                    )
                    || character.discord_user_id;

                return {
                    name:
                        `${character.display_name} — ${ownerName}`
                            .slice(0, 100),
                    value: character.id
                };
            })
        );
    }

};
