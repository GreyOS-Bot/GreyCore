const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require("discord.js");

const serverConfig =
    require("../../managers/ServerConfigManager");

const guildRepository =
    require("../../v2/repositories/GuildRepository");

const v2 =
    require("../../v2");

const moduleSettingsHandler =
    require(
        "../../v2/interactions/settings/GuildModuleSettingsHandler"
    );

const guildManagementPolicy =
    require(
        "../../v2/core/policies/GuildManagementPolicy"
    );

const validationStaffPolicy =
    require(
        "../../v2/core/policies/ValidationStaffPolicy"
    );

const {
    replyError
} = require(
    "../../v2/core/services/InteractionResponseService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("config")
        .setDescription("Configure Greycore (staff).")

        .addSubcommand(sub =>
            sub
                .setName("set")
                .setDescription(
                    "Modifie un paramètre."
                )
                .addStringOption(option =>
                    option
                        .setName("cle")
                        .setDescription(
                            "Nom du paramètre"
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("valeur")
                        .setDescription(
                            "Valeur"
                        )
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
    sub
        .setName("get")
        .setDescription(
            "Affiche un paramètre."
        )
        .addStringOption(option =>
            option
                .setName("cle")
                .setDescription(
                    "Nom du paramètre"
                )
                .setRequired(true)
        )
)

        .addSubcommand(sub =>
            sub
                .setName("validation")
                .setDescription(
                    "Configure le salon de validation du serveur."
                )
                .addChannelOption(option =>
                    option
                        .setName("salon")
                        .setDescription(
                            "Salon où seront envoyées les demandes de validation."
                        )
                        .addChannelTypes(
                            ChannelType.GuildText
                        )
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("creer")
                        .setDescription(
                            "Crée automatiquement un salon privé de validation."
                        )
                        .setRequired(false)
                )
                .addRoleOption(option =>
                    option
                        .setName("role_staff")
                        .setDescription(
                            "Rôle qui aura accès au salon créé automatiquement."
                        )
                        .setRequired(false)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("journaux")
                .setDescription(
                    "Configure le salon des erreurs GreyCore."
                )
                .addChannelOption(option =>
                    option
                        .setName("salon")
                        .setDescription(
                            "Salon privé où le staff recevra les erreurs importantes."
                        )
                        .addChannelTypes(
                            ChannelType.GuildText
                        )
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("desactiver")
                        .setDescription(
                            "Désactive l’envoi des erreurs dans un salon."
                        )
                        .setRequired(false)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("automatisation")
                .setDescription(
                    "Configure l’accueil après des personnages validés."
                )
                .addRoleOption(option =>
                    option
                        .setName("role_a_verifier")
                        .setDescription(
                            "Rôle que le membre doit avoir avant l’automatisation."
                        )
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("personnages_valides")
                        .setDescription(
                            "Nombre de personnages validés requis (2 par défaut)."
                        )
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(false)
                )
                .addRoleOption(option =>
                    option
                        .setName("role_a_retirer")
                        .setDescription(
                            "Rôle retiré lorsque le seuil est atteint."
                        )
                        .setRequired(false)
                )
                .addRoleOption(option =>
                    option
                        .setName("role_a_ajouter")
                        .setDescription(
                            "Rôle ajouté lorsque le seuil est atteint."
                        )
                        .setRequired(false)
                )
                .addChannelOption(option =>
                    option
                        .setName("salon_bienvenue")
                        .setDescription(
                            "Salon où GreyCore publiera le message de bienvenue."
                        )
                        .addChannelTypes(
                            ChannelType.GuildText,
                            ChannelType.GuildAnnouncement
                        )
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName("message")
                        .setDescription(
                            "Message de bienvenue personnalisé."
                        )
                        .setMaxLength(2_000)
                        .setRequired(false)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("automatisation-voir")
                .setDescription(
                    "Affiche la configuration de l’accueil automatique."
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("automatisation-desactiver")
                .setDescription(
                    "Désactive l’accueil automatique après validation."
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("scenes")
                .setDescription(
                    "Configure l'Assistant de gestion des sc\u00e8nes RP."
                )
                .addStringOption(option =>
                    option
                        .setName("mode")
                        .setDescription(
                            "Crit\u00e8re de recommandation \u00e0 suivre."
                        )
                        .addChoices(
                            {
                                name: "Dur\u00e9e uniquement",
                                value: "duration"
                            },
                            {
                                name: "Messages uniquement",
                                value: "messages"
                            },
                            {
                                name: "Dur\u00e9e et messages",
                                value: "both"
                            },
                            {
                                name: "D\u00e9sactiver l'assistant",
                                value: "disabled"
                            }
                        )
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("duree_jours")
                        .setDescription(
                            "Dur\u00e9e recommand\u00e9e d'une sc\u00e8ne, en jours."
                        )
                        .setMinValue(1)
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName("messages_recommandes")
                        .setDescription(
                            "Nombre de messages RP recommand\u00e9."
                        )
                        .setMinValue(1)
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName("inactivite_heures")
                        .setDescription(
                            "Délai avant de proposer une clôture (48 heures par défaut)."
                        )
                        .setMinValue(1)
                        .setMaxValue(720)
                        .setRequired(false)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("limite-pj")
                .setDescription(
                    "Configure la limite de création des PJ."
                )
                .addBooleanOption(option =>
                    option
                        .setName("active")
                        .setDescription(
                            "Active ou désactive la limite sur ce serveur."
                        )
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("maximum")
                        .setDescription(
                            "Nombre maximal de PJ pendant la période (2 par défaut)."
                        )
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName("periode_jours")
                        .setDescription(
                            "Durée de la période en jours (7 par défaut)."
                        )
                        .setMinValue(1)
                        .setMaxValue(365)
                        .setRequired(false)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("modules")
                .setDescription(
                    "Active ou désactive les modules du serveur."
                )
        ),

    async execute(interaction) {
        const subcommand =
            interaction.options.getSubcommand();

        if (
            !guildManagementPolicy.canManage(interaction)
            && !validationStaffPolicy
                .canManageServerTools(interaction)
        ) {
            return replyError(
                interaction,
                "Seules les personnes autorisées à gérer le serveur peuvent modifier sa configuration."
            );
        }

        guildRepository.ensure(
            interaction.guild.id,
            interaction.guild.name,
            new Date().toISOString()
        );

        if (subcommand === "modules") {
            return moduleSettingsHandler.open(interaction);
        }

        if (subcommand === "limite-pj") {
            const enabled =
                interaction.options
                    .getBoolean("active");

            const current =
                v2.managers.guildSettings
                    .getPlayedCharacterCreationLimit(
                        interaction.guild.id
                    );

            try {
                const configuration =
                    v2.managers.guildSettings
                        .configurePlayedCharacterCreationLimit(
                            interaction.guild.id,
                            {
                                enabled,
                                limitCount:
                                    interaction.options
                                        .getInteger("maximum")
                                    || current.limitCount,
                                windowDays:
                                    interaction.options
                                        .getInteger("periode_jours")
                                    || current.windowDays
                            }
                        );

                return interaction.reply({
                    content: enabled
                        ? [
                            "✅ Limite de création des PJ activée.",
                            `Chaque membre peut créer **${configuration.pj_creation_limit_count} PJ** sur **${configuration.pj_creation_limit_window_days} jours glissants**.`,
                            "Les PNJ, Random et personnages réservés ne sont pas concernés."
                        ].join("\n")
                        : "✅ Limite de création des PJ désactivée sur ce serveur.",
                    ephemeral: true
                });
            } catch (error) {
                return replyError(
                    interaction,
                    error
                );
            }
        }

        if (subcommand === "scenes") {
            const mode = interaction.options.getString("mode");

            if (mode === "disabled") {
                const configuration =
                    v2.managers.sceneAssistant.disable(
                        interaction.guild.id
                    );

                return interaction.reply({
                    content: configuration
                        ? "\u2705 L'Assistant de gestion des sc\u00e8nes est d\u00e9sactiv\u00e9. Les zones et seuils configur\u00e9s sont conserv\u00e9s."
                        : "\u2139\uFE0F L'Assistant de gestion des sc\u00e8nes n'\u00e9tait pas encore configur\u00e9.",
                    ephemeral: true
                });
            }

            const durationDays =
                interaction.options.getInteger(
                    "duree_jours"
                );
            const recommendedMessageCount =
                interaction.options.getInteger(
                    "messages_recommandes"
                );
            const inactivityHours =
                interaction.options.getInteger(
                    "inactivite_heures"
                ) || 48;

            if (
                (mode === "duration" || mode === "both")
                && durationDays == null
            ) {
                return replyError(
                    interaction,
                    "Indique `duree_jours` pour ce mode de suivi."
                );
            }

            if (
                (mode === "messages" || mode === "both")
                && recommendedMessageCount == null
            ) {
                return replyError(
                    interaction,
                    "Indique `messages_recommandes` pour ce mode de suivi."
                );
            }

            if (
                mode === "duration"
                && recommendedMessageCount != null
            ) {
                return replyError(
                    interaction,
                    "Le mode Dur\u00e9e uniquement ne doit pas recevoir de nombre de messages."
                );
            }

            if (
                mode === "messages"
                && durationDays != null
            ) {
                return replyError(
                    interaction,
                    "Le mode Messages uniquement ne doit pas recevoir de dur\u00e9e."
                );
            }

            try {
                const configuration =
                    v2.managers.sceneAssistant.configure({
                        guildId: interaction.guild.id,
                        durationDays: mode === "messages"
                            ? null
                            : durationDays,
                        recommendedMessageCount:
                            mode === "duration"
                                ? null
                                : recommendedMessageCount,
                        inactivityHours
                    });

                return interaction.reply({
                    content: [
                        "\u2705 Assistant de gestion des sc\u00e8nes activ\u00e9.",
                        formatSceneAssistantSummary(
                            configuration
                        ),
                        "Ajoute ensuite les zones RP avec `/scene ajouter-zone`. Le suivi ne bloque et ne ferme jamais les salons."
                    ].join("\n"),
                    ephemeral: true
                });
            } catch (error) {
                return replyError(
                    interaction,
                    error
                );
            }
        }

        if (subcommand === "automatisation-voir") {
            const configuration =
                v2.managers
                    .characterApprovalAutomation
                    .getConfiguration(
                        interaction.guild.id
                    );

            if (!configuration) {
                return interaction.reply({
                    content: [
                        "ℹ️ Aucun accueil automatique n’est encore configuré.",
                        "Utilise `/config automatisation` pour le mettre en place.",
                        "Variables disponibles : `{user}`, `{username}`, `{server}`, `{count}` et `{character}`."
                    ].join("\n"),
                    ephemeral: true
                });
            }

            return interaction.reply({
                content: formatAutomationSummary(
                    configuration
                ),
                ephemeral: true
            });
        }

        if (subcommand === "automatisation-desactiver") {
            const configuration =
                v2.managers
                    .characterApprovalAutomation
                    .disable(
                        interaction.guild.id
                    );

            return interaction.reply({
                content: configuration
                    ? "✅ L’accueil automatique après validation est désactivé. La configuration est conservée."
                    : "ℹ️ Aucun accueil automatique n’était configuré sur ce serveur.",
                ephemeral: true
            });
        }

        if (subcommand === "automatisation") {
            try {
                const configuration =
                    v2.managers
                        .characterApprovalAutomation
                        .configure({
                            guildId:
                                interaction.guild.id,
                            approvedCharacterCount:
                                interaction.options.getInteger(
                                    "personnages_valides"
                                )
                                || 2,
                            requiredRoleId:
                                interaction.options.getRole(
                                    "role_a_verifier"
                                ).id,
                            removeRoleId:
                                interaction.options.getRole(
                                    "role_a_retirer"
                                )?.id
                                || null,
                            addRoleId:
                                interaction.options.getRole(
                                    "role_a_ajouter"
                                )?.id
                                || null,
                            welcomeChannelId:
                                interaction.options.getChannel(
                                    "salon_bienvenue"
                                )?.id
                                || null,
                            welcomeMessage:
                                interaction.options.getString(
                                    "message"
                                )
                        });

                return interaction.reply({
                    content: [
                        "✅ Accueil automatique activé.",
                        formatAutomationSummary(
                            configuration
                        ),
                        "Variables du message : `{user}`, `{username}`, `{server}`, `{count}` et `{character}`.",
                        "GreyCore ne le déclenchera qu’une seule fois par membre."
                    ].join("\n"),
                    ephemeral: true
                });
            } catch (error) {
                return replyError(
                    interaction,
                    error.message
                    || "Impossible de configurer l’accueil automatique."
                );
            }
        }

        if (subcommand === "journaux") {
            const channel =
                interaction.options.getChannel(
                    "salon"
                );

            const shouldDisable =
                interaction.options.getBoolean(
                    "desactiver"
                ) === true;

            if (channel && shouldDisable) {
                return replyError(
                    interaction,
                    "Choisis un salon ou la désactivation, pas les deux."
                );
            }

            if (shouldDisable) {
                v2.managers.guildSettings
                    .removeErrorLogChannel(
                        interaction.guild.id
                    );

                return interaction.reply({
                    content: "✅ Le journal d’erreurs staff est désactivé.",
                    ephemeral: true
                });
            }

            if (!channel) {
                return replyError(
                    interaction,
                    "Choisis le salon privé du staff qui doit recevoir les erreurs, ou utilise `desactiver:Oui`."
                );
            }

            try {
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x57F287)
                            .setTitle(
                                "✅ Journal d’erreurs GreyCore activé"
                            )
                            .setDescription(
                                "Ce message confirme que GreyCore peut publier les erreurs techniques dans ce salon."
                            )
                            .setTimestamp()
                    ]
                });
            } catch (error) {
                return replyError(
                    interaction,
                    "GreyCore ne peut pas envoyer de message dans ce salon. Vérifie ses permissions Voir le salon, Envoyer des messages et Intégrer des liens."
                );
            }

            v2.managers.guildSettings
                .setErrorLogChannel(
                    interaction.guild.id,
                    channel.id
                );

            return interaction.reply({
                content: [
                    "✅ Journal d’erreurs staff configuré.",
                    `Le message de test et les erreurs inattendues seront envoyés dans ${channel}.`
                ].join("\n"),
                ephemeral: true
            });
        }

        if (
            subcommand === "validation"
        ) {
            const channel =
                interaction.options.getChannel(
                    "salon"
                );

            const shouldCreate =
                interaction.options.getBoolean("creer")
                === true;

            const staffRole =
                interaction.options.getRole("role_staff");

            if (channel && shouldCreate) {
                return interaction.reply({
                    content: "❌ Choisis un salon existant ou la création automatique, pas les deux.",
                    ephemeral: true
                });
            }

            if (shouldCreate) {
                if (!staffRole) {
                    return interaction.reply({
                        content: "❌ Choisis le rôle staff qui doit accéder au salon créé.",
                        ephemeral: true
                    });
                }

                let createdChannel;

                try {
                    createdChannel =
                        await interaction.guild.channels.create({
                            name: "📋・validations",
                            type: ChannelType.GuildText,
                            permissionOverwrites: [
                                {
                                    id: interaction.guild.roles.everyone.id,
                                    deny: [
                                        PermissionFlagsBits.ViewChannel
                                    ]
                                },
                                {
                                    id: staffRole.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory
                                    ]
                                },
                                {
                                    id: interaction.guild.members.me.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory,
                                        PermissionFlagsBits.ManageMessages
                                    ]
                                }
                            ],
                            reason: "Configuration GreyCore : salon de validation"
                        });
                } catch (error) {
                    return replyError(
                        interaction,
                        "Impossible de créer ce salon. Vérifie que GreyCore peut gérer les salons et les permissions."
                    );
                }

                v2.managers.guildSettings
                    .setValidationChannel(
                        interaction.guild.id,
                        createdChannel.id
                    );

                return interaction.reply({
                    content: [
                        "✅ Salon de validation créé et enregistré.",
                        `Le staff peut maintenant utiliser ${createdChannel}.`
                    ].join("\n"),
                    ephemeral: true
                });
            }

            if (!channel) {
                return interaction.reply({
                    content: "ℹ️ Choisis l’option `salon` pour utiliser un salon existant, ou `creer:Oui` avec `role_staff` pour laisser GreyCore en créer un privé.",
                    ephemeral: true
                });
            }

            v2.managers.guildSettings
                .setValidationChannel(
                    interaction.guild.id,
                    channel.id
                );

            return interaction.reply({
                content: [
                        "✅ Salon de validation enregistré.",
                    "",
                    `Les prochaines demandes de ce serveur seront envoyées dans ${channel}.`
                ].join("\n"),
                ephemeral: true
            });
        }

        const key =
            interaction.options.getString(
                "cle"
            );

        if (subcommand === "set") {
            const value =
                interaction.options.getString(
                    "valeur"
                );

            serverConfig.set(
                interaction.guild.id,
                key,
                value
            );

            return interaction.reply({
                content:
                    `✅ **${key}** = \`${value}\``,
                ephemeral: true
            });
        }

        if (subcommand === "get") {
            const value =
                serverConfig.get(
                    interaction.guild.id,
                    key,
                    "Non défini"
                );

            return interaction.reply({
                content:
                    `⚙️ **${key}** = \`${value}\``,
                ephemeral: true
            });
        }
    }
};

function formatAutomationSummary(configuration) {
    const status = configuration.is_enabled
        ? "activé"
        : "désactivé";

    return [
        `⚙️ Accueil automatique **${status}**`,
        `• Seuil : **${configuration.approved_character_count}** personnage(s) validé(s)`,
        `• Rôle à vérifier : <@&${configuration.required_role_id}>`,
        `• Rôle retiré : ${formatRole(configuration.remove_role_id)}`,
        `• Rôle ajouté : ${formatRole(configuration.add_role_id)}`,
        `• Salon de bienvenue : ${formatChannel(configuration.welcome_channel_id)}`,
        `• Message : ${truncateMessage(configuration.welcome_message)}`
    ].join("\n");
}

function truncateMessage(message) {
    const value = String(message || "").trim();

    return value.length > 300
        ? `${value.slice(0, 299)}…`
        : value || "Non défini";
}

function formatRole(roleId) {
    return roleId
        ? `<@&${roleId}>`
        : "Aucun";
}

function formatChannel(channelId) {
    return channelId
        ? `<#${channelId}>`
        : "Aucun";
}

function formatSceneAssistantSummary(configuration) {
    const durationDays =
        configuration.duration_days;
    const recommendedMessageCount =
        configuration.recommended_message_count;
    const inactivityHours =
        configuration.inactivity_hours || 48;

    return [
        `\u2022 Dur\u00e9e recommand\u00e9e : ${durationDays ? `**${durationDays} jour(s)**` : "non suivie"}`,
        `\u2022 Messages RP recommand\u00e9s : ${recommendedMessageCount ? `**${recommendedMessageCount}**` : "non suivis"}`,
        `• Proposition de clôture après : **${inactivityHours} heure(s) d'inactivité**`
    ].join("\n");
}
