const drafts = require('./SceneContextSelectionService').createStore();
const expand = value => /^[a-f0-9]{32}$/i.test(value)
    ? `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}` : value;

module.exports = {
    sceneId(action, scene) {
        if (!scene.context_id) return `${action}:${scene.id}`; // pre-3B cards/fixtures
        const id = /^scenev2_[a-f0-9-]{36}$/i.test(scene.id) ? `~${scene.id.slice(8).replaceAll('-', '')}` : scene.id;
        const context = /^[a-f0-9-]{36}$/i.test(scene.context_id) ? scene.context_id.replaceAll('-', '') : scene.context_id;
        const result = `${action}:${id}:${context}`;
        if (result.length > 100) throw new Error('Identifiant de scène trop long.');
        return result;
    },
    parseScene(customId) {
        const [, raw, contextId, ...extra] = customId.split(':');
        if (!raw || extra.length) throw new Error('Identifiant de scène invalide.');
        return { sceneId: raw.startsWith('~') ? `scenev2_${expand(raw.slice(1))}` : raw,
            contextId: contextId === undefined ? null : expand(contextId) };
    },
    issue(interaction, data, now = Date.now()) {
        const token = drafts.create({ ...data, guildId: interaction.guildId, userId: interaction.user.id,
            channelId: interaction.channelId }, now);
        return `v3_scene_action:${token}`;
    },
    read(interaction, now = Date.now(), consume = false) {
        const [, token, ...extra] = interaction.customId.split(':');
        const draft = drafts.get(token, interaction.guildId, interaction.user.id, now);
        if (extra.length || !draft || draft.channelId !== interaction.channelId) return null;
        if (consume) drafts.take(token, interaction.guildId, interaction.user.id, now);
        return { ...draft };
    }
};
