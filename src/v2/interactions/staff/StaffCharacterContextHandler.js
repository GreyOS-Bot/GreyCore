const drafts = require("../../services/contexts/CharacterContextSelectionService");
const decision = require("../../core/services/StaffPermissionDecisionService");
const installationManager = require("../../managers/InstallationV2Manager");
const rosterManager = require("../../managers/CharacterRosterV2Manager");
const { replyError } = require("../../core/services/InteractionResponseService");

module.exports = async interaction => {
    if (!interaction.customId?.startsWith("v3_staff_character:")) return false;
    const [, action, token, rawPage] = interaction.customId.split(":");
    if (!token || !["select", "prev", "next", "roster", "rosterpage"].includes(action)) {
        await replyError(interaction, "Cette interface Characters est invalide."); return true;
    }
    if (!decision.decide({ interaction, permission: "characters", write: false }).allowed) {
        await replyError(interaction, "Tu n’as pas accès à la gestion des personnages."); return true;
    }
    const draft = drafts.get(token, interaction.guildId, interaction.user.id);
    if (!draft) { await replyError(interaction, "Cette sélection a expiré. Rouvre Characters."); return true; }
    try {
        const contextId = action === "select" ? interaction.values?.[0] : draft.contextId;
        if (action === "select" && interaction.values?.length !== 1) throw new Error("Choisis un Context.");
        const context = installationManager.resolveContext(interaction.guildId, contextId);
        const nextContextPage = draft.page + (action === "next" ? 1 : action === "prev" ? -1 : 0);
        if (action === "roster" || action === "rosterpage") {
            const roster = rosterManager.getRosterByContext(interaction.guildId, context.id, { includeArchived: true });
            const requested = action === "rosterpage" ? Number(rawPage) || 0 : 0;
            await interaction.update(require("../../views/staff/StaffCharacterRosterView").build(roster, requested, context, token));
        } else {
            await interaction.update(require("../../pages/staff/StaffCharactersPage").build(interaction, context.id, nextContextPage));
        }
    } catch (error) { await replyError(interaction, error); }
    return true;
};
