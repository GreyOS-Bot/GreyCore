const scopes = require('../../services/scenes/SceneContextInteractionService');
const manager = require('../../managers/SceneAssistantV2Manager');
const { replyError } = require('../../core/services/InteractionResponseService');

module.exports = async interaction => {
    if (!interaction.customId?.startsWith('v3_scene_action:')) return false;
    const draft = scopes.read(interaction);
    const kinds = { start: 'modal', resume: 'string', moveChannel: 'channel', move: 'modal', newChannel: 'channel', newMove: 'modal' };
    const matches = kind => kind === 'modal' ? interaction.isModalSubmit?.()
        : kind === 'string' ? interaction.isStringSelectMenu?.() : kind === 'channel' && interaction.isChannelSelectMenu?.();
    if (!draft || !matches(kinds[draft.action])) {
        await replyError(interaction, 'Cette interface de scène a expiré. Rouvre-la.');
        return true;
    }
    try {
        manager.resolveContext(interaction.guildId, draft.contextId, { write: true });
        // Consume synchronously before dispatch/await: a second submit cannot replay the action.
        if (!scopes.read(interaction, Date.now(), true)) throw new Error('Cette interface a déjà été utilisée.');
        const handler = require('./SceneInteractionHandler');
        const actions = {
            start: () => handler.submitStart(interaction, draft.contextId),
            resume: () => handler.selectResume(interaction, draft.contextId),
            moveChannel: () => handler.selectMoveChannel(interaction, draft.sceneId, draft.contextId),
            move: () => handler.submitMove(interaction, draft.sceneId, draft.destinationId, draft.contextId),
            newChannel: () => handler.selectNewMoveChannel(interaction, draft.contextId),
            newMove: () => handler.submitNewMove(interaction, draft.destinationId, draft.contextId)
        };
        await actions[draft.action]();
    } catch (error) {
        await replyError(interaction, error);
    }
    return true;
};
