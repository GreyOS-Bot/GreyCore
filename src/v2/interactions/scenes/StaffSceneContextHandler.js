const drafts = require('../../services/scenes/SceneContextSelectionService');
const decision = require('../../core/services/StaffPermissionDecisionService');
const manager = require('../../managers/SceneAssistantV2Manager');
const { replyError } = require('../../core/services/InteractionResponseService');

module.exports = async interaction => {
    if (!interaction.customId?.startsWith('v3_staff_scene:')) return false;
    const [, action, token, ...extra] = interaction.customId.split(':');
    const isSelection = action === 'select' && interaction.isStringSelectMenu?.();
    const isButton = ['prev', 'next', 'cycle', 'diagnostic'].includes(action) && interaction.isButton?.();
    if (extra.length || (!isSelection && !isButton)) {
        await replyError(interaction, 'Cette interface de scènes est invalide.');
        return true;
    }
    if (!decision.decide({ interaction, permission: 'scenes', write: action === 'cycle' }).allowed) {
        await replyError(interaction, 'Tu n’as pas accès à cette action sur les scènes.');
        return true;
    }
    const draft = drafts.get(token, interaction.guildId, interaction.user.id);
    if (!draft) {
        await replyError(interaction, 'Cette sélection a expiré. Rouvre les scènes.');
        return true;
    }
    try {
        if (isSelection && interaction.values?.length !== 1) throw new Error('Choisis un contexte.');
        const contextId = isSelection ? interaction.values[0] : draft.contextId;
        manager.resolveContext(interaction.guildId, contextId, { write: true });
        const page = require('../../pages/staff/StaffScenesPage');
        if (action === 'cycle') {
            if (!drafts.take(token, interaction.guildId, interaction.user.id)) throw new Error('Cette action a déjà été utilisée.');
            require('../../services/scenes/SceneAssistantService').startNewCycle({
                guildId: interaction.guildId, channel: interaction.channel, contextId
            });
        }
        if (action === 'diagnostic') {
            await interaction.update(page.buildDiagnostic(interaction, contextId));
        } else {
            const nextPage = draft.page + (action === 'next' ? 1 : action === 'prev' ? -1 : 0);
            await interaction.update(page.build(interaction, contextId, nextPage));
        }
    } catch (error) {
        await replyError(interaction, error);
    }
    return true;
};
