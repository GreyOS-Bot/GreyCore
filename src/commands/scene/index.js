const {
    SlashCommandBuilder,
    ChannelType,
    EmbedBuilder
} = require("discord.js");

const sceneAssistantService =
    require(
        "../../v2/services/scenes/SceneAssistantService"
    );

const sceneAssistantManager =
    require(
        "../../v2/managers/SceneAssistantV2Manager"
    );

const guildRepository =
    require(
        "../../v2/repositories/GuildRepository"
    );

const {
    canRead,
    canWrite
} = require(
    "../../v2/core/services/AdministrativePermissionAccessService"
);

const {
    replyError,
    replyPrivate
} = require(
    "../../v2/core/services/InteractionResponseService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("scene")
        .setDescription("Consulte et organise les cycles de sc\u00e8ne RP.")

        .addSubcommand(sub =>
            sub
                .setName("statut")
                .setDescription(
                    "Affiche le cycle de sc\u00e8ne du salon actuel."
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("ajouter-zone")
                .setDescription(
                    "Ajoute un salon, un forum ou une cat\u00e9gorie RP au suivi."
                )
                .addChannelOption(option =>
                    option
                        .setName("zone")
                        .setDescription(
                            "Salon, forum ou cat\u00e9gorie qui contient les sc\u00e8nes RP."
                        )
                        .addChannelTypes(
                            ChannelType.GuildText,
                            ChannelType.GuildAnnouncement,
                            ChannelType.GuildForum,
                            ChannelType.GuildCategory
                        )
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("retirer-zone")
                .setDescription(
                    "Retire une zone RP du suivi."
                )
                .addChannelOption(option =>
                    option
                        .setName("zone")
                        .setDescription(
                            "Zone RP \u00e0 retirer du suivi."
                        )
                        .addChannelTypes(
                            ChannelType.GuildText,
                            ChannelType.GuildAnnouncement,
                            ChannelType.GuildForum,
                            ChannelType.GuildCategory
                        )
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("zones")
                .setDescription(
                    "Affiche les zones actuellement suivies."
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("ajouter-categorie-actuelle")
                .setDescription(
                    "Ajoute la catégorie du salon actuel sans utiliser le sélecteur Discord."
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("diagnostic")
                .setDescription(
                    "Vérifie la configuration des scènes dans le salon actuel."
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("nouveau-cycle")
                .setDescription(
                    "Relance un cycle dans le salon RP actuel, sans le fermer."
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("expressions")
                .setDescription("Affiche les expressions qui proposent un rattrapage.")
        )

        .addSubcommand(sub =>
            sub
                .setName("ajouter-expression")
                .setDescription("Ajoute une expression qui propose un rattrapage.")
                .addStringOption(option =>
                    option
                        .setName("expression")
                        .setDescription("Exemple : On passe en privé ?")
                        .setMaxLength(100)
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("retirer-expression")
                .setDescription("Retire une expression de rattrapage.")
                .addStringOption(option =>
                    option
                        .setName("expression")
                        .setDescription("Expression à retirer.")
                        .setMaxLength(100)
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        if (!interaction.guildId) {
            return replyError(
                interaction,
                "Cette commande doit \u00eatre utilis\u00e9e sur un serveur."
            );
        }

        const subcommand =
            interaction.options.getSubcommand();

        if (subcommand === "statut") {
            return replyPrivate(
                interaction,
                buildStatusPayload(
                    sceneAssistantService.getStatus({
                        guildId: interaction.guildId,
                        channel: interaction.channel
                    })
                )
            );
        }

        const canReadScenes =
            subcommand === "zones" ||
            subcommand === "expressions";

        const canWriteScenes =
            subcommand === "ajouter-zone" ||
            subcommand === "retirer-zone" ||
            subcommand === "ajouter-categorie-actuelle" ||
            subcommand === "ajouter-expression" ||
            subcommand === "retirer-expression" ||
            subcommand === "nouveau-cycle";

        if (canReadScenes && !canRead(interaction, "scenes")) {
            return replyError(
                interaction,
                "Tu n’as pas la permission GreyCore requise pour lire les scènes."
            );
        }

        if (canWriteScenes && !canWrite(interaction, "scenes")) {
            return replyError(
                interaction,
                "Tu n’as pas la permission GreyCore requise pour modifier les scènes."
            );
        }

        if (subcommand === "diagnostic") {
            const configuration =
                sceneAssistantManager.getConfiguration(
                    interaction.guildId
                );
            const scopes =
                sceneAssistantManager.getScopes(
                    interaction.guildId
                );
            const channelIds =
                sceneAssistantService.getChannelAndParentIds(
                    interaction.channel,
                    interaction.channelId
                );
            const matchedScope = scopes.find(
                scope => channelIds.includes(
                    String(scope.channel_id)
                )
            );
            const activeScene =
                sceneAssistantManager.getActiveSceneByChannel(
                    interaction.guildId,
                    interaction.channelId
                );

            return replyPrivate(
                interaction,
                [
                    "🧪 **Diagnostic des cycles de scènes**",
                    "",
                    `Module : ${Number(configuration?.is_enabled) === 1 ? "✅ Activé" : "❌ Désactivé"}`,
                    `Zones configurées : **${scopes.length}**`,
                    `Salon actuel reconnu : ${matchedScope ? `✅ Oui, via <#${matchedScope.channel_id}>` : "❌ Non"}`,
                    `Scène active ici : ${activeScene ? `✅ **${activeScene.title}**` : "ℹ️ Aucune"}`,
                    "",
                    scopes.length
                        ? `Zones : ${scopes.map(scope => `<#${scope.channel_id}>`).join(", ")}`
                        : "Utilise `/scene ajouter-zone` ou `/scene ajouter-categorie-actuelle`."
                ].join("\n")
            );
        }

        if (subcommand === "ajouter-zone") {
            guildRepository.ensure(
                interaction.guildId,
                interaction.guild?.name || "Serveur Discord",
                new Date().toISOString()
            );

            const zone = interaction.options.getChannel("zone");

            const scopes = sceneAssistantManager.addScope({
                guildId: interaction.guildId,
                channelId: zone.id,
                createdBy: interaction.user.id
            });

            return replyPrivate(
                interaction,
                [
                    `\u2705 ${zone} est maintenant une zone RP suivie.`,
                    "Le suivi commencera seulement lorsque l'Assistant de gestion des sc\u00e8nes sera activ\u00e9 via `/config scenes`.",
                    `Zones configur\u00e9es : **${scopes.length}**.`
                ].join("\n")
            );
        }

        if (
            subcommand ===
                "ajouter-categorie-actuelle"
        ) {
            guildRepository.ensure(
                interaction.guildId,
                interaction.guild?.name || "Serveur Discord",
                new Date().toISOString()
            );

            const categoryId =
                interaction.channel?.parentId;

            if (!categoryId) {
                return replyError(
                    interaction,
                    "Ce salon n’est placé dans aucune catégorie."
                );
            }

            const category =
                interaction.guild.channels.cache.get(
                    categoryId
                )
                || await interaction.guild.channels
                    .fetch(categoryId)
                    .catch(() => null);

            if (
                !category
                || category.type !==
                    ChannelType.GuildCategory
            ) {
                return replyError(
                    interaction,
                    "La catégorie parente est introuvable."
                );
            }

            const scopes =
                sceneAssistantManager.addScope({
                    guildId:
                        interaction.guildId,
                    channelId:
                        category.id,
                    createdBy:
                        interaction.user.id
                });

            return replyPrivate(
                interaction,
                `✅ La catégorie **${category.name}** est maintenant suivie. Zones configurées : **${scopes.length}**.`
            );
        }

        if (subcommand === "retirer-zone") {
            guildRepository.ensure(
                interaction.guildId,
                interaction.guild?.name || "Serveur Discord",
                new Date().toISOString()
            );

            const zone = interaction.options.getChannel("zone");
            const removed = sceneAssistantManager.removeScope(
                interaction.guildId,
                zone.id
            );

            return replyPrivate(
                interaction,
                removed
                    ? `\u2705 ${zone} ne fait plus partie des zones RP suivies.`
                    : "\u2139\uFE0F Cette zone n'\u00e9tait pas suivie."
            );
        }

        if (subcommand === "zones") {
            const scopes = sceneAssistantManager.getScopes(
                interaction.guildId
            );

            return replyPrivate(
                interaction,
                scopes.length
                    ? [
                        "\u{1F5FA}\uFE0F **Zones RP suivies**",
                        ...scopes.map(
                            scope => `<#${scope.channel_id}>`
                        )
                    ].join("\n")
                    : "\u2139\uFE0F Aucune zone RP n'est encore configur\u00e9e. Utilise `/scene ajouter-zone`."
            );
        }

        if (subcommand === "expressions") {
            const expressions = sceneAssistantManager
                .getTriggerExpressions(interaction.guildId);

            return replyPrivate(
                interaction,
                [
                    "🔄 **Expressions de rattrapage**",
                    ...expressions.map(
                        trigger => `• ${trigger.expression}`
                    ),
                    "",
                    "Dans une scène active, GreyCore proposera alors de poursuivre la scène dans un autre salon."
                ].join("\n")
            );
        }

        if (subcommand === "ajouter-expression") {
            guildRepository.ensure(
                interaction.guildId,
                interaction.guild?.name || "Serveur Discord",
                new Date().toISOString()
            );

            try {
                const expression = interaction.options
                    .getString("expression", true);

                sceneAssistantManager.addTriggerExpression({
                    guildId: interaction.guildId,
                    expression,
                    createdBy: interaction.user.id
                });

                return replyPrivate(
                    interaction,
                    `✅ L'expression **${expression}** est maintenant reconnue.`
                );
            } catch (error) {
                return replyError(interaction, error);
            }
        }

        if (subcommand === "retirer-expression") {
            guildRepository.ensure(
                interaction.guildId,
                interaction.guild?.name || "Serveur Discord",
                new Date().toISOString()
            );

            const expression = interaction.options
                .getString("expression", true);
            const removed = sceneAssistantManager
                .removeTriggerExpression(
                    interaction.guildId,
                    expression
                );

            return replyPrivate(
                interaction,
                removed
                    ? `✅ L'expression **${expression}** a été retirée.`
                    : "ℹ️ Cette expression n'était pas configurée."
            );
        }

        if (subcommand === "nouveau-cycle") {
            guildRepository.ensure(
                interaction.guildId,
                interaction.guild?.name || "Serveur Discord",
                new Date().toISOString()
            );

            try {
                sceneAssistantService.startNewCycle({
                    guildId: interaction.guildId,
                    channel: interaction.channel
                });

                return replyPrivate(
                    interaction,
                    "\u2705 Un nouveau cycle de sc\u00e8ne commence ici. Le salon reste enti\u00e8rement ouvert et jouable."
                );
            } catch (error) {
                return replyError(
                    interaction,
                    error
                );
            }
        }
    }
};

function buildStatusPayload(status) {
    if (status.kind === "disabled") {
        return "\u2139\uFE0F L'Assistant de gestion des sc\u00e8nes est d\u00e9sactiv\u00e9 sur ce serveur.";
    }

    if (status.kind === "untracked") {
        return "\u2139\uFE0F Ce salon ne fait pas partie d'une zone RP suivie.";
    }

    if (status.kind === "not_started") {
        return sceneAssistantService.buildStartPrompt();
    }

    const {
        cycle,
        evaluation
    } = status;
    const fields = [];

    if (evaluation.durationDays) {
        fields.push({
            name: "\u{1F5D3}\uFE0F Dur\u00e9e",
            value: `Jour **${evaluation.elapsedDays}** / **${evaluation.durationDays}**`,
            inline: true
        });
    }

    if (evaluation.recommendedMessageCount) {
        fields.push({
            name: "\u{1F4AC} Messages RP",
            value: `**${cycle.rp_message_count}** / **${evaluation.recommendedMessageCount}**`,
            inline: true
        });
    }

    const isConclude = cycle.status === "conclude";

    const payload = {
        embeds: [
            new EmbedBuilder()
                .setColor(
                    isConclude
                        ? 0xFEE75C
                        : 0x57F287
                )
                .setTitle(
                    isConclude
                        ? "\u{1F7E8} Cycle de sc\u00e8ne : \u00c0 conclure"
                        : "\u{1F7E9} Cycle de sc\u00e8ne : En cours"
                )
                .setAuthor({
                    name: cycle.title || "Scène RP"
                })
                .setDescription(
                    isConclude
                        ? "Cette sc\u00e8ne d\u00e9passe les recommandations du serveur. Vous pouvez continuer sans restriction ; conclure la sc\u00e8ne ou en ouvrir une nouvelle peut simplement aider la chronologie RP."
                        : "Suivi indicatif uniquement : aucune limite ni fermeture automatique n'est appliqu\u00e9e."
                )
                .addFields(fields)
                .setFooter({
                    text: "Assistant de gestion des sc\u00e8nes GreyCore"
                })
                .setTimestamp()
        ]
    };

    return payload;
}
