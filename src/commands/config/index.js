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
                        .setName("role_a_verifier")
                        .setDescription(
                            "Rôle que le membre doit avoir avant l’automatisation."
                        )
                        .setRequired(true)
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
