const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const rosterManager =
    require(
        "../../v2/managers/CharacterRosterV2Manager"
    );

const deploymentService =
    require(
        "../../v2/services/deployment/DeploymentV2Service"
    );

const characterTypes =
    require(
        "../../v2/core/character/CharacterTypeCatalog"
    );

const characterTypeCorrectionService =
    require(
        "../../v2/services/character/CharacterTypeCorrectionService"
    );

const {
    requireStaffCommandAccess
} = require(
    "../../v2/core/services/StaffCommandAccessService"
);

const {
    replyPrivate
} = require(
    "../../v2/core/services/InteractionResponseService"
);

const ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        .split("");

const EMBED_DESCRIPTION_LIMIT = 3500;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("personnages")
        .setDescription(
            "Gère les personnages présents sur ce serveur."
        )
        .addSubcommand(sub =>
            sub
                .setName("liste")
                .setDescription(
                    "Affiche les personnages validés du serveur."
                )
                .addStringOption(option =>
                    option
                        .setName("lettre")
                        .setDescription(
                            "Première lettre du prénom à afficher"
                        )
                        .setAutocomplete(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName("inclure_archives")
                        .setDescription(
                            "Inclure les personnages archivés"
                        )
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("deployer-tous")
                .setDescription(
                    "Installe et valide tous les personnages absents du serveur."
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("corriger")
                .setDescription(
                    "Corrige les informations d’un personnage installé."
                )
                .addUserOption(option =>
                    option
                        .setName("utilisateur")
                        .setDescription(
                            "Propriétaire du personnage"
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("personnage")
                        .setDescription(
                            "Personnage à corriger"
                        )
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription(
                            "Nouveau type du personnage"
                        )
                        .addChoices(
                            {
                                name: "PJ",
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
                    option.setName("proxy")
                        .setDescription("Nouveau proxy à taper")
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option.setName("alias")
                        .setDescription("Prénom ou alias affiché")
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option.setName("vrai_prenom")
                        .setDescription("Vrai prénom facultatif")
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option.setName("nom")
                        .setDescription("Nom de famille")
                        .setMaxLength(100)
                )
                .addIntegerOption(option =>
                    option.setName("age")
                        .setDescription("Âge du personnage")
                        .setMinValue(0)
                        .setMaxValue(999)
                )
                .addStringOption(option =>
                    option.setName("organisation")
                        .setDescription("Gang ou organisation")
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option.setName("metier")
                        .setDescription("Métier du personnage")
                        .setMaxLength(100)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("archiver")
                .setDescription(
                    "Archive les personnages d’un utilisateur."
                )
                .addUserOption(option =>
                    option
                        .setName("utilisateur")
                        .setDescription(
                            "Propriétaire des personnages"
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("restaurer")
                .setDescription(
                    "Restaure les personnages archivés d’un utilisateur."
                )
                .addUserOption(option =>
                    option
                        .setName("utilisateur")
                        .setDescription(
                            "Propriétaire des personnages"
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("supprimer")
                .setDescription(
                    "Supprime définitivement les personnages d’un utilisateur."
                )
                .addUserOption(option =>
                    option
                        .setName("utilisateur")
                        .setDescription(
                            "Propriétaire des personnages"
                        )
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName("confirmer")
                        .setDescription(
                            "Confirme la suppression définitive"
                        )
                        .setRequired(true)
                )
        ),

    async autocomplete(interaction) {
        const focused =
            interaction.options.getFocused(
                true
            );

        if (focused.name === "personnage") {
            const owner =
                interaction.options.getUser(
                    "utilisateur"
                );

            if (!owner) {
                return interaction.respond([]);
            }

            const filter = String(
                focused.value || ""
            ).trim().toLowerCase();

            return interaction.respond(
                rosterManager
                    .getByOwnerOnGuild(
                        interaction.guildId,
                        owner.id
                    )
                    .filter(character =>
                        !filter
                        || String(
                            character.firstname
                            || character.proxy_name
                        ).toLowerCase().includes(filter)
                    )
                    .slice(0, 25)
                    .map(character => ({
                        name: `${character.firstname || character.proxy_name} — ${characterTypes.getDisplayLabel(character.character_type)}`,
                        value: character.id
                    }))
            );
        }

        if (focused.name !== "lettre") {
            return interaction.respond([]);
        }

        const filter =
            normalizeLetter(
                focused.value
            );

        return interaction.respond(
            ALPHABET
                .filter(letter =>
                    !filter
                    || letter.startsWith(filter)
                )
                .slice(0, 25)
                .map(letter => ({
                    name:
                        `Lettre ${letter}`,
                    value:
                        letter
                }))
        );
    },

    async execute(interaction) {
        const subcommand =
            interaction.options.getSubcommand();

        // La liste sert aussi à choisir un prénom avant la création :
        // elle doit donc rester consultable par tous les membres.
        if (subcommand === "liste") {
            const letter =
                normalizeLetter(
                    interaction.options.getString(
                        "lettre"
                    )
                );

            if (
                letter
                && !ALPHABET.includes(letter)
            ) {
                return replyPrivate(
                    interaction,
                    "⚠️ Choisis une lettre de A à Z pour afficher les personnages correspondants."
                );
            }

            return replyPrivate(
                interaction,
                buildRosterView(
                    interaction.guildId,
                    letter,
                    interaction.options.getBoolean(
                        "inclure_archives"
                    ) === true
                )
            );
        }

        if (
            !await requireStaffCommandAccess(
                interaction
            )
        ) {
            return;
        }

        if (subcommand === "deployer-tous") {
            const result =
                deploymentService
                    .deployAllExisting({
                        guildId:
                            interaction.guildId,
                        guildName:
                            interaction.guild?.name
                            || interaction.guildId,
                        approvedBy:
                            interaction.user?.id
                    });

            return replyPrivate(
                interaction,
                buildBulkDeploymentMessage(
                    result.total
                )
            );
        }

        if (subcommand === "corriger") {
            const user =
                interaction.options.getUser(
                    "utilisateur"
                );
            const characterId =
                interaction.options.getString(
                    "personnage",
                    true
                );
            const characterType =
                interaction.options.getString(
                    "type"
                );
            const changes = {
                characterType,
                proxyName:
                    interaction.options.getString("proxy"),
                alias:
                    interaction.options.getString("alias"),
                firstname:
                    interaction.options.getString("vrai_prenom"),
                lastname:
                    interaction.options.getString("nom"),
                age:
                    interaction.options.getInteger("age"),
                gang:
                    interaction.options.getString("organisation"),
                occupation:
                    interaction.options.getString("metier")
            };
            const result =
                characterTypeCorrectionService
                    .correct({
                        guildId:
                            interaction.guildId,
                        discordUserId:
                            user.id,
                        characterId,
                        changes
                    });

            return replyPrivate(
                interaction,
                [
                    "✅ **Fiche corrigée**",
                    `Personnage : **${result.firstname || result.proxy_name}**`,
                    `Propriétaire : ${user}`,
                    `Type actuel : **${characterTypes.getDisplayLabel(result.character_type)}**`,
                    `Champs corrigés : **${result.changedFields.join(", ")}**`,
                    "",
                    "La portée du personnage sur le serveur a également été mise à jour."
                ].join("\n")
            );
        }

        const user =
            interaction.options.getUser(
                "utilisateur"
            );

        if (subcommand === "archiver") {
            const result =
                rosterManager.archiveOwnerCharacters(
                    interaction.guildId,
                    user.id
                );

            return replyPrivate(
                interaction,
                buildLifecycleMessage(
                    "📦 Personnages archivés",
                    result.updated.length,
                    user,
                    "Toutes leurs données sont conservées. Utilise `/personnages restaurer` pour les rendre à nouveau jouables."
                )
            );
        }

        if (subcommand === "restaurer") {
            const result =
                rosterManager.restoreOwnerCharacters(
                    interaction.guildId,
                    user.id
                );

            return replyPrivate(
                interaction,
                buildLifecycleMessage(
                    "✅ Personnages restaurés",
                    result.updated.length,
                    user,
                    "Les personnages redeviennent visibles et jouables selon l’état de leurs installations."
                )
            );
        }

        if (
            interaction.options.getBoolean(
                "confirmer"
            ) !== true
        ) {
            return replyPrivate(
                interaction,
                "⚠️ La suppression définitive nécessite l’option `confirmer` réglée sur `Vrai`."
            );
        }

        const result =
            rosterManager.deleteOwnerCharacters(
                interaction.guildId,
                user.id
            );

        return replyPrivate(
            interaction,
            buildLifecycleMessage(
                "🗑️ Personnages supprimés",
                result.deleted.length,
                user,
                "Cette suppression est définitive et efface les données associées à ces personnages."
            )
        );
    }
};

function buildRosterView(
    guildId,
    letter,
    includeArchived
) {
    const characters =
        rosterManager.getRoster(
            guildId,
            { includeArchived }
        )
            .filter(character =>
                !letter
                || normalizeLetter(
                    character.firstname
                ) === letter
            );

    const descriptions =
        splitDescriptions(
            characters.map(
                formatCharacter
            )
        );

    return {
        embeds: descriptions.map(
            (description, index) =>
                new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle(
                    letter
                        ? `📚 Personnages du serveur — ${letter}`
                        : "📚 Personnages installés sur le serveur"
                )
                .setDescription(
                    description
                )
                .setFooter({
                    text:
                        characters.length > 0
                            ? `${characters.length} personnage(s) • Classement alphabétique${letter ? ` • Lettre ${letter}` : ""}${descriptions.length > 1 ? ` • Suite ${index + 1}/${descriptions.length}` : ""}`
                            : letter
                                ? `Aucun personnage ne commence par ${letter}`
                                : "Aucun personnage validé n'est installé sur ce serveur"
                })
        )
    };
}

function splitDescriptions(entries) {
    if (entries.length === 0) {
        return [
            "Aucun personnage validé n'est installé sur ce serveur."
        ];
    }

    const descriptions = [];
    let description = "";

    for (const entry of entries) {
        const nextDescription =
            description
                ? `${description}\n${entry}`
                : entry;

        if (
            description
            && nextDescription.length >
                EMBED_DESCRIPTION_LIMIT
        ) {
            descriptions.push(description);
            description = entry;
            continue;
        }

        description = nextDescription;
    }

    if (description) {
        descriptions.push(description);
    }

    return descriptions;
}

function normalizeLetter(value) {
    return String(value || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .charAt(0);
}

function formatCharacter(character) {
    character = {
        ...character,
        firstname:
            String(
                character.firstname ||
                ""
            ).normalize("NFC")
    };

    return [
        `• **${character.firstname}**`,
        formatOwner(character.discord_user_id),
        characterTypes.getDisplayLabel(
            character.character_type
        ),
        character.is_archived
            ? "📦 Archivé"
            : null
    ]
        .filter(Boolean)
        .join(" — ");
}

function formatOwner(discordUserId) {
    const value = String(
        discordUserId || ""
    );

    return value.startsWith("forgotten:")
        ? "Ancien utilisateur (anonymisé)"
        : `<@${value}>`;
}

function buildLifecycleMessage(
    title,
    total,
    user,
    detail
) {
    return [
        `**${title} : ${total}**`,
        `Propriétaire : ${user}`,
        "",
        detail
    ].join("\n");
}

function buildBulkDeploymentMessage(
    total
) {
    if (total === 0) {
        return [
            "\u2139\uFE0F **Aucun personnage \u00E0 d\u00E9ployer**",
            "Tous les personnages actifs sont d\u00E9j\u00E0 install\u00E9s sur ce serveur, ou sont archiv\u00E9s."
        ].join("\n");
    }

    return [
        "\u2705 **D\u00E9ploiement termin\u00E9**",
        `**${total}** personnage(s) ont \u00E9t\u00E9 install\u00E9s et valid\u00E9s sur ce serveur.`,
        "Ils sont imm\u00E9diatement jouables. Les personnages d\u00E9j\u00E0 install\u00E9s n\u2019ont pas \u00E9t\u00E9 modifi\u00E9s."
    ].join("\n");
}
