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

const {
    replyError
} = require(
    "../../v2/core/services/InteractionResponseService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("config")
        .setDescription("Configure Greycore.")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

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
