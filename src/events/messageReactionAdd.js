const sceneAssistantManager =
    require("../v2/managers/SceneAssistantV2Manager");

module.exports = {
    name: "messageReactionAdd",

    async execute(reaction, user) {
        if (user?.bot || reaction.emoji?.name !== "🎬") {
            return;
        }

        if (reaction.partial) {
            reaction = await reaction.fetch().catch(() => null);
        }
        if (!reaction) {
            return;
        }

        const message = reaction.message.partial
            ? await reaction.message.fetch().catch(() => null)
            : reaction.message;
        if (!message) {
            return;
        }
        const proposal = sceneAssistantManager
            .getStartProposalByMessage(message.id);

        if (!proposal || proposal.guild_id !== (message.guildId || message.guild?.id)
            || proposal.channel_id !== (message.channelId || message.channel?.id)) {
            return;
        }

        if (
            sceneAssistantManager.getActiveSceneByChannel(
                proposal.guild_id,
                proposal.channel_id,
                proposal.context_id
            )
        ) {
            sceneAssistantManager.resolveStartProposal(
                proposal.guild_id,
                proposal.channel_id,
                "obsolete"
            );
            await reaction.remove().catch(() => null);
            return;
        }

        const startedAt = proposal.proposed_at;
        const dateLabel = new Intl.DateTimeFormat(
            "fr-FR",
            {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Europe/Paris"
            }
        ).format(new Date(startedAt));

        const scene = sceneAssistantManager.createScene({
            guildId: proposal.guild_id,
            contextId: proposal.context_id,
            channelId: proposal.channel_id,
            title: `Scène du ${dateLabel}`,
            createdBy: user.id,
            startedAt
        });

        if (proposal.character_id) {
            sceneAssistantManager.addParticipant(
                scene.id,
                proposal.character_id,
                startedAt,
                { guildId: proposal.guild_id, contextId: scene.context_id }
            );
        }

        sceneAssistantManager.recordSceneMessage(
            scene.id,
            startedAt,
            { guildId: proposal.guild_id, contextId: scene.context_id }
        );

        sceneAssistantManager.resolveStartProposal(
            proposal.guild_id,
            proposal.channel_id,
            "started"
        );

        await reaction.remove().catch(() => null);
    }
};
