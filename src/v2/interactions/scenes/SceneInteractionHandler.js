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
const logger = require("../../core/services/TechnicalLogger")
    .create("SceneInteractionHandler");
const {
    replyError,
    replyPrivate,
    editOrReplyError,
    deferPrivate
} = require("../../core/services/InteractionResponseService");

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

    const source = interaction.channel;
    const destination = await interaction.client.channels
        .fetch(destinationId)
        .catch(() => null);

    if (!source || !destination?.isTextBased?.()) {
        return editOrReplyError(interaction, "Le salon de destination est inaccessible à GreyCore.");
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

    await sendNarrativeOrFallback({
        channel: source,
        triggerKey: "scene_moved",
        suffix: `🔄 La scène **${scene.title}** se poursuit désormais dans <#${destinationId}>.`,
        fallback: `🔄 La scène **${scene.title}** se poursuit désormais dans <#${destinationId}>.`
    });
    const destinationContinuity = [
        `🔄 Suite de la scène **${scene.title}** provenant de <#${source.id}>.`,
        "",
        "**Dernier échange :**",
        quote,
        transition?.url ? `\n[Voir le message d’origine](${transition.url})` : ""
    ].filter(Boolean).join("\n");
    await sendNarrativeOrFallback({
        channel: destination,
        triggerKey: "scene_moved",
        suffix: destinationContinuity,
        fallback: destinationContinuity
    });

    manager.moveScene({
        sceneId,
        guildId: interaction.guildId,
        sourceChannelId: source.id,
        destinationChannelId: destinationId,
        transitionMessageId: transition?.id || null,
        createdBy: interaction.user.id
    });

    return interaction.editReply({
        content: `✅ **${scene.title}** a été déplacée vers <#${destinationId}> sans réinitialiser son cycle.`
    });
}

function resume(interaction) {
    const scenes = manager.getActiveScenes(interaction.guildId)
        .filter(scene => !String(scene.channel_ids || "").split(",").includes(interaction.channelId))
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
                    value: scene.id,
                    description: `${scene.rp_message_count} message(s) RP`.slice(0, 100)
                })))
        )]
    });
}

async function selectResume(interaction) {
    const scene = manager.getScene(interaction.values[0]);
    if (!scene || scene.guild_id !== interaction.guildId) {
        return replyError(interaction, "Cette scène est introuvable.");
    }

    const sourceChannelId = String(scene.channel_ids || "")
        .split(",")
        .find(Boolean) || null;

    manager.moveScene({
        sceneId: scene.id,
        guildId: interaction.guildId,
        sourceChannelId,
        destinationChannelId: interaction.channelId,
        transitionMessageId: null,
        createdBy: interaction.user.id
    });

    if (sourceChannelId) {
        const source = await interaction.client.channels
            .fetch(sourceChannelId)
            .catch(() => null);
        const recent = source?.messages
            ? await source.messages.fetch({ limit: 25 }).catch(() => null)
            : null;
        const transition = recent?.find(message =>
            message.author?.id !== interaction.client.user?.id
            && (message.content?.trim() || message.attachments?.size)
        ) || null;
        await source?.send?.(
            `🔄 La scène **${scene.title}** se poursuit désormais dans <#${interaction.channelId}>.`
        );

        const quote = transition
            ? String(transition.content || "📎 Pièce jointe")
                .slice(0, 1200)
                .split("\n")
                .map(line => `> ${line}`)
                .join("\n")
            : "> Aucun message de transition disponible.";

        await interaction.channel.send([
            `🔄 Suite de la scène **${scene.title}** provenant de <#${sourceChannelId}>.`,
            "",
            "**Dernier échange :**",
            quote,
            transition?.url ? `\n[Voir le message d’origine](${transition.url})` : ""
        ].filter(Boolean).join("\n"));
    }

    return interaction.update({
        content: `✅ **${scene.title}** se poursuit maintenant dans <#${interaction.channelId}>.`,
        components: []
    });
}

function openMove(interaction, sceneId) {
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

function selectMoveChannel(interaction, sceneId) {
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

    manager.closeScene(sceneId);
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
    manager.closeScene(sceneId);
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

async function sendNarrativeOrFallback({ channel, triggerKey, suffix, fallback }) {
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

module.exports = {
    start,
    submitStart,
    resume,
    selectResume,
    openMove,
    selectMoveChannel,
    submitMove,
    voteClose,
    closeNow,
    keepOpen
};
