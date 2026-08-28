const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ChannelType
} = require("discord.js");

const manager = require("../../managers/SceneAssistantV2Manager");
const sceneAssistantService = require("../../services/scenes/SceneAssistantService");
const narrativeEntityService = require("../../services/entities/NarrativeEntityService");
const staffPermissionPolicy = require("../../core/policies/StaffPermissionPolicy");
const logger = require("../../core/services/TechnicalLogger")
    .create("SceneInteractionHandler");
const threadAccessService = require(
    "../../core/services/DiscordThreadAccessService"
);
const {
    replyError,
    replyPrivate,
    editOrReplyError,
    deferPrivate
} = require("../../core/services/InteractionResponseService");

const MOVE_PERMISSION_ERROR =
    "Seuls un participant, la personne ayant créé cette scène ou le staff chargé des scènes peuvent la déplacer.";

function canMoveScene(interaction, scene, staffWrite = undefined) {
    if (!scene || scene.guild_id !== interaction.guildId) {
        return false;
    }

    const userId = String(interaction.user?.id || "");
    return Boolean(
        manager.isSceneParticipantUser?.(scene.id, userId)
        || String(scene.created_by || "") === userId
        || (
            staffWrite
            ?? staffPermissionPolicy.canAccess(
                interaction,
                "scenes",
                { write: true }
            )
        )
    );
}

function start(interaction) {
    const title = new TextInputBuilder()
        .setCustomId("title")
        .setLabel("Nom de la scène")
        .setPlaceholder("Ex. Soirée au Steel")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    return interaction.showModal(
        new ModalBuilder()
            .setCustomId("v2_scene_start_submit")
            .setTitle("Commencer une scène")
            .addComponents(new ActionRowBuilder().addComponents(title))
    );
}

async function submitStart(interaction) {
    if (manager.getActiveSceneByChannel(interaction.guildId, interaction.channelId)) {
        return replyError(interaction, "Une scène est déjà active dans ce salon.");
    }

    const scene = manager.createScene({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        title: interaction.fields.getTextInputValue("title"),
        createdBy: interaction.user.id
    });

    await sendNarrativeOrFallback({
        channel: interaction.channel,
        triggerKey: "scene_created",
        suffix: `🎬 **${scene.title}** commence dans <#${interaction.channelId}>.`,
        fallback: null
    });

    return replyPrivate(
        interaction,
        `✅ La scène **${scene.title}** commence dans <#${interaction.channelId}>.`
    );
}

async function submitMove(interaction, sceneId, destinationId) {
    await deferPrivate(interaction);

    const scene = manager.getScene(sceneId);
    if (!scene || scene.guild_id !== interaction.guildId) {
        return editOrReplyError(interaction, "Cette scène est introuvable.");
    }

    if (!canMoveScene(interaction, scene)) {
        return editOrReplyError(interaction, MOVE_PERMISSION_ERROR);
    }

    const source = interaction.channel;
    const destination = await interaction.client.channels
        .fetch(destinationId)
        .catch(() => null);

    if (!source || !destination?.isTextBased?.()) {
        return editOrReplyError(interaction, "Le salon de destination est inaccessible à GreyCore.");
    }
    if (
        !belongsToGuild(
            destination,
            interaction.guildId
        )
    ) {
        return editOrReplyError(
            interaction,
            "Le salon de destination n’appartient pas à ce serveur."
        );
    }
    if (source.id === destinationId) {
        return editOrReplyError(
            interaction,
            "Cette scène se trouve déjà dans ce salon."
        );
    }

    const rawReference = interaction.fields
        .getTextInputValue("transition_message")
        .trim();
    const requestedId = rawReference.match(/\d{15,22}(?!.*\d)/)?.[0] || null;
    let transition = requestedId
        ? await source.messages.fetch(requestedId).catch(() => null)
        : null;

    if (!transition) {
        const recent = await source.messages.fetch({ limit: 25 });
        transition = recent.find(message =>
            message.id !== interaction.message?.id
            && message.author?.id !== interaction.client.user?.id
            && (message.content?.trim() || message.attachments?.size)
        ) || null;
    }

    const quote = transition
        ? String(transition.content || "📎 Pièce jointe")
            .slice(0, 1200)
            .split("\n")
            .map(line => `> ${line}`)
            .join("\n")
        : "> Aucun message de transition disponible.";

    const destinationContinuity = [
        `🔄 Suite de la scène **${scene.title}** provenant de <#${source.id}>.`,
        "",
        "**Dernier échange :**",
        quote,
        transition?.url ? `\n[Voir le message d’origine](${transition.url})` : ""
    ].filter(Boolean).join("\n");

    const moveResult =
        manager.moveSceneIfCurrent({
            sceneId,
            guildId:
                interaction.guildId,
            expectedSourceChannelId:
                source.id,
            destinationChannelId:
                destinationId,
            transitionMessageId:
                transition?.id
                || null,
            createdBy:
                interaction.user.id
        });

    if (!moveResult.moved) {
        return editOrReplyError(
            interaction,
            moveFailureMessage(
                moveResult.reason
            )
        );
    }

    const failedAnnouncements =
        await publishMoveAnnouncements({
            sceneId,
            sourceChannelId:
                source.id,
            destinationChannelId:
                destinationId,
            sendSource: () =>
                sendNarrativeOrFallback({
                    channel: source,
                    triggerKey:
                        "scene_moved",
                    suffix:
                        `🔄 La scène **${scene.title}** se poursuit désormais dans <#${destinationId}>.`,
                    fallback:
                        `🔄 La scène **${scene.title}** se poursuit désormais dans <#${destinationId}>.`
                }),
            sendDestination: () =>
                sendNarrativeOrFallback({
                    channel:
                        destination,
                    triggerKey:
                        "scene_moved",
                    suffix:
                        destinationContinuity,
                    fallback:
                        destinationContinuity
                })
        });

    return interaction.editReply({
        content:
            moveConfirmation(
                scene,
                destinationId,
                failedAnnouncements
            )
    });
}

function resume(interaction) {
    const canManageScenes = staffPermissionPolicy.canAccess(
        interaction,
        "scenes",
        { write: true }
    );
    const scenes = manager.getActiveScenes(interaction.guildId)
        .filter(scene => !String(scene.channel_ids || "").split(",").includes(interaction.channelId))
        .filter(scene => canManageScenes || canMoveScene(interaction, scene, false))
        .slice(0, 25);

    if (!scenes.length) {
        return replyError(interaction, "Aucune autre scène active ne peut être reprise.");
    }

    return replyPrivate(interaction, {
        content: "🔗 Choisis la scène à poursuivre dans ce salon.",
        components: [new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("v2_scene_resume_select")
                .setPlaceholder("Choisir une scène")
                .addOptions(scenes.map(scene => ({
                    label: scene.title.slice(0, 100),
                    value:
                        resumeSelectionValue(
                            scene
                        ),
                    description: `${scene.rp_message_count} message(s) RP`.slice(0, 100)
                })))
        )]
    });
}

async function selectResume(interaction) {
    const {
        sceneId,
        expectedSourceChannelId
    } = parseResumeSelection(
        interaction.values[0]
    );
    const scene = manager.getScene(sceneId);
    if (!scene || scene.guild_id !== interaction.guildId) {
        return replyError(interaction, "Cette scène est introuvable.");
    }

    if (!canMoveScene(interaction, scene)) {
        return replyError(interaction, MOVE_PERMISSION_ERROR);
    }

    if (!expectedSourceChannelId) {
        return replyError(
            interaction,
            "Cette interface n’est plus active. Rouvrez GreyCore pour continuer."
        );
    }
    if (
        !interaction.channel
            ?.isTextBased?.()
        || !belongsToGuild(
            interaction.channel,
            interaction.guildId
        )
    ) {
        return replyError(
            interaction,
            "Le salon de destination est inaccessible à GreyCore."
        );
    }
    if (
        expectedSourceChannelId
        === interaction.channelId
    ) {
        return replyError(
            interaction,
            "Cette scène se trouve déjà dans ce salon."
        );
    }

    const source =
        await interaction.client.channels
            .fetch(
                expectedSourceChannelId
            )
            .catch(() => null);
    const recent = source?.messages
        ? await source.messages
            .fetch({
                limit: 25
            })
            .catch(() => null)
        : null;
    const transition =
        recent?.find(message =>
            message.author?.id !== interaction.client.user?.id
            && (message.content?.trim() || message.attachments?.size)
        ) || null;
    const quote = transition
        ? String(
            transition.content
            || "📎 Pièce jointe"
        )
            .slice(0, 1200)
            .split("\n")
            .map(line => `> ${line}`)
            .join("\n")
        : "> Aucun message de transition disponible.";
    const destinationContinuity = [
        `🔄 Suite de la scène **${scene.title}** provenant de <#${expectedSourceChannelId}>.`,
        "",
        "**Dernier échange :**",
        quote,
        transition?.url
            ? `\n[Voir le message d’origine](${transition.url})`
            : ""
    ].filter(Boolean).join("\n");

    const moveResult =
        manager.moveSceneIfCurrent({
            sceneId: scene.id,
            guildId: interaction.guildId,
            expectedSourceChannelId,
            destinationChannelId:
                interaction.channelId,
            transitionMessageId:
                transition?.id
                || null,
            createdBy:
                interaction.user.id
        });

    if (!moveResult.moved) {
        return replyError(
            interaction,
            moveFailureMessage(
                moveResult.reason
            )
        );
    }

    const failedAnnouncements =
        await publishMoveAnnouncements({
            sceneId: scene.id,
            sourceChannelId:
                expectedSourceChannelId,
            destinationChannelId:
                interaction.channelId,
            sendSource: () =>
                source?.send
                    ? sendWritableMessage(
                        source,
                        `🔄 La scène **${scene.title}** se poursuit désormais dans <#${interaction.channelId}>.`
                    )
                    : Promise.reject(
                        new Error(
                            "Salon source inaccessible."
                        )
                    ),
            sendDestination: () =>
                sendWritableMessage(
                    interaction.channel,
                    destinationContinuity
                )
        });

    return interaction.update({
        content:
            moveConfirmation(
                scene,
                interaction.channelId,
                failedAnnouncements
            ),
        components: []
    });
}

function openMove(interaction, sceneId) {
    const scene = manager.getScene(sceneId);
    if (!scene || scene.guild_id !== interaction.guildId) {
        return replyError(interaction, "Cette scène est introuvable.");
    }
    if (!canMoveScene(interaction, scene)) {
        return replyError(interaction, MOVE_PERMISSION_ERROR);
    }

    return replyPrivate(interaction, {
        content: "➡️ Choisis le salon où poursuivre la scène.",
        components: [new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(`v2_scene_move_channel:${sceneId}`)
                .setPlaceholder("Salon de destination")
                .setChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread)
        )]
    });
}

function openNewMove(interaction) {
    return replyPrivate(interaction, {
        content: "➡️ Choisis le salon où poursuivre cette scène.",
        components: [new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId("v2_scene_move_new_channel")
                .setPlaceholder("Salon de destination")
                .setChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread)
        )]
    });
}

function selectNewMoveChannel(interaction) {
    const destinationId = interaction.values[0];
    const title = new TextInputBuilder()
        .setCustomId("title")
        .setLabel("Nom de la scène")
        .setPlaceholder("Ex. Soirée au Steel")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);
    const message = new TextInputBuilder()
        .setCustomId("transition_message")
        .setLabel("Lien ou identifiant du message (facultatif)")
        .setPlaceholder("Vide = dernier message du salon actuel")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    return interaction.showModal(
        new ModalBuilder()
            .setCustomId(`v2_scene_move_new_submit:${destinationId}`)
            .setTitle("Poursuivre en rattrapage")
            .addComponents(
                new ActionRowBuilder().addComponents(title),
                new ActionRowBuilder().addComponents(message)
            )
    );
}

async function submitNewMove(interaction, destinationId) {
    if (manager.getActiveSceneByChannel(interaction.guildId, interaction.channelId)) {
        return replyError(interaction, "Une scène est déjà active dans ce salon. Relance la demande de rattrapage.");
    }
    const destination = await interaction.client.channels
        .fetch(destinationId)
        .catch(() => null);
    if (!destination?.isTextBased?.()) {
        return replyError(interaction, "Le salon de destination est inaccessible à GreyCore.");
    }
    if (!belongsToGuild(destination, interaction.guildId)) {
        return replyError(interaction, "Le salon de destination n’appartient pas à ce serveur.");
    }
    if (interaction.channelId === destinationId) {
        return replyError(interaction, "Cette scène se trouve déjà dans ce salon.");
    }
    if (manager.getActiveSceneByChannel(interaction.guildId, destinationId)) {
        return replyError(interaction, "Une autre scène active utilise déjà ce salon.");
    }

    const scene = manager.createScene({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        title: interaction.fields.getTextInputValue("title"),
        createdBy: interaction.user.id
    });
    return submitMove(interaction, scene.id, destinationId);
}

function selectMoveChannel(interaction, sceneId) {
    const scene = manager.getScene(sceneId);
    if (!scene || scene.guild_id !== interaction.guildId) {
        return replyError(interaction, "Cette scène est introuvable.");
    }
    if (!canMoveScene(interaction, scene)) {
        return replyError(interaction, MOVE_PERMISSION_ERROR);
    }

    const destinationId = interaction.values[0];
    const message = new TextInputBuilder()
        .setCustomId("transition_message")
        .setLabel("Lien ou identifiant du message (facultatif)")
        .setPlaceholder("Vide = dernier message du salon actuel")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    return interaction.showModal(
        new ModalBuilder()
            .setCustomId(`v2_scene_move_submit:${sceneId}:${destinationId}`)
            .setTitle("Déplacer la scène")
            .addComponents(new ActionRowBuilder().addComponents(message))
    );
}

async function voteClose(interaction, sceneId) {
    const scene = manager.getScene(sceneId);
    const prompt = manager.getClosurePromptByMessage(
        interaction.message.id
    );

    if (!scene || !prompt || scene.guild_id !== interaction.guildId) {
        return replyError(interaction, "Cette proposition de clôture n'est plus active.");
    }

    if (!manager.isSceneParticipantUser(sceneId, interaction.user.id)) {
        return replyError(
            interaction,
            "Seuls les participants de cette scène peuvent confirmer sa clôture."
        );
    }

    const votes = manager.addClosureVote(sceneId, interaction.user.id);
    if (votes < 2) {
        return interaction.update({
            components: [
                sceneAssistantService.buildClosureActions(scene, votes)
            ]
        });
    }

    const closedScene =
        manager.closeScene(
            sceneId,
            {
                requirePendingPrompt:
                    true
            }
        );

    if (!closedScene) {
        return replyError(
            interaction,
            "Cette scène a déjà été clôturée."
        );
    }

    await sendNarrativeOrFallback({
        channel: interaction.channel,
        triggerKey: "scene_closed",
        suffix: `🏁 La scène **${scene.title}** est désormais clôturée.`,
        fallback: null
    });
    return interaction.update({
        content: `🏁 La scène **${scene.title}** est clôturée après la confirmation de deux participants.`,
        embeds: [],
        components: []
    });
}

async function keepOpen(interaction, sceneId, cancelled = false) {
    const scene = manager.getScene(sceneId);
    const prompt = manager.getClosurePromptByMessage(
        interaction.message.id
    );

    if (!scene || !prompt || scene.guild_id !== interaction.guildId) {
        return replyError(interaction, "Cette proposition de clôture n'est plus active.");
    }

    if (!manager.isSceneParticipantUser(sceneId, interaction.user.id)) {
        return replyError(
            interaction,
            "Seuls les participants de cette scène peuvent agir sur cette proposition."
        );
    }

    manager.keepSceneOpen(sceneId);
    return interaction.update({
        content: cancelled
            ? "❌ Proposition de clôture annulée."
            : "⏳ La scène reste ouverte. GreyCore attendra une nouvelle période d'inactivité.",
        embeds: [],
        components: []
    });
}

async function closeNow(interaction, sceneId) {
    const scene = manager.getScene(sceneId);
    if (!scene || scene.guild_id !== interaction.guildId) {
        return replyError(interaction, "Cette scène est introuvable ou déjà clôturée.");
    }
    const isParticipant = manager.isSceneParticipantUser(sceneId, interaction.user.id);
    const isCreator = String(scene.created_by || "") === String(interaction.user.id);
    if (!isParticipant && !isCreator) {
        return replyError(interaction, "Seuls un participant ou la personne ayant créé cette scène peuvent la clôturer.");
    }
    const closedScene =
        manager.closeScene(sceneId);

    if (!closedScene) {
        return replyError(
            interaction,
            "Cette scène a déjà été clôturée."
        );
    }

    await sendNarrativeOrFallback({
        channel: interaction.channel,
        triggerKey: "scene_closed",
        suffix: `🏁 La scène **${scene.title}** est désormais clôturée.`,
        fallback: null
    });
    return interaction.update({
        content: `🏁 La scène **${scene.title}** est clôturée.`,
        embeds: [],
        components: []
    });
}

function resumeSelectionValue(scene) {
    const sourceChannelId =
        String(
            scene.channel_ids
            || ""
        )
            .split(",")
            .find(Boolean)
        || "";

    return [
        scene.id,
        sourceChannelId
    ].join("|");
}

function parseResumeSelection(value) {
    const [
        sceneId,
        expectedSourceChannelId
    ] = String(value || "")
        .split("|");

    return {
        sceneId,
        expectedSourceChannelId:
            expectedSourceChannelId
            || null
    };
}

function belongsToGuild(
    channel,
    guildId
) {
    return String(
        channel?.guildId
        || channel?.guild?.id
        || ""
    ) === String(guildId || "");
}

function moveFailureMessage(reason) {
    if (reason === "destination_occupied") {
        return "Une autre scène active utilise déjà ce salon.";
    }

    if (reason === "same_channel") {
        return "Cette scène se trouve déjà dans ce salon.";
    }

    return "Cette scène a été déplacée ou modifiée entre-temps. Actualisez l’interface avant de réessayer.";
}

function moveConfirmation(
    scene,
    destinationChannelId,
    failedAnnouncements
) {
    if (failedAnnouncements.length) {
        return [
            `⚠️ La scène **${scene.title}** a bien été déplacée vers <#${destinationChannelId}>,`,
            "mais une partie des annonces n’a pas pu être publiée."
        ].join(" ");
    }

    return `✅ **${scene.title}** a été déplacée vers <#${destinationChannelId}> sans réinitialiser son cycle.`;
}

async function publishMoveAnnouncements({
    sceneId,
    sourceChannelId,
    destinationChannelId,
    sendSource,
    sendDestination
}) {
    const failures = [];
    const announcements = [
        [
            "source",
            sendSource
        ],
        [
            "destination",
            sendDestination
        ]
    ];

    for (const [
        stage,
        send
    ] of announcements) {
        try {
            await send();
        } catch (error) {
            failures.push(stage);
            logger.error(
                "Annonce de déplacement de scène impossible.",
                {
                    sceneId,
                    sourceChannelId,
                    destinationChannelId,
                    stage
                },
                error
            );
        }
    }

    return failures;
}

async function sendNarrativeOrFallback({ channel, triggerKey, suffix, fallback }) {
    const access =
        await threadAccessService.ensureWritable(
            channel
        );

    if (!access.ready) {
        throw threadAccessService.errorFor(
            access,
            "scene_announcement"
        );
    }

    channel = access.channel || channel;

    try {
        const sent = await narrativeEntityService.send({
            channel,
            triggerKey,
            suffix
        });
        if (sent) return sent;
    } catch (error) {
        logger.warn(
            "[NarrativeEntity] Envoi impossible, utilisation du message standard :",
            error.message
        );
    }
    return fallback && channel?.send
        ? channel.send(fallback)
        : null;
}

async function sendWritableMessage(channel, payload) {
    const access =
        await threadAccessService.ensureWritable(
            channel
        );

    if (!access.ready) {
        throw threadAccessService.errorFor(
            access,
            "scene_announcement"
        );
    }

    return (access.channel || channel).send(
        payload
    );
}

module.exports = {
    start,
    submitStart,
    resume,
    selectResume,
    openMove,
    openNewMove,
    selectNewMoveChannel,
    submitNewMove,
    selectMoveChannel,
    submitMove,
    canMoveScene,
    voteClose,
    closeNow,
    keepOpen
};
