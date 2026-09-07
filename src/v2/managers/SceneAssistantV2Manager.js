const repository =
    require(
        "../repositories/SceneAssistantRepository"
    );
const { randomUUID } = require("node:crypto");

class SceneAssistantV2Manager {

    normalizeTriggerExpression(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLocaleLowerCase("fr-FR")
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    getTriggerExpressions(guildId) {
        const configured = repository.getTriggerExpressions(guildId);
        return configured.length
            ? configured
            : [{
                expression: "Rattrapage ?",
                normalized_expression: "rattrapage",
                is_default: 1
            }];
    }

    addTriggerExpression({ guildId, expression, createdBy }) {
        const cleanExpression = String(expression || "").trim();
        const normalizedExpression = this.normalizeTriggerExpression(cleanExpression);
        if (!normalizedExpression) {
            throw new Error("L’expression de déclenchement est vide.");
        }

        if (!repository.getTriggerExpressions(guildId).length) {
            repository.addTriggerExpression({
                guildId,
                expression: "Rattrapage ?",
                normalizedExpression: "rattrapage",
                createdBy,
                createdAt: new Date().toISOString()
            });
        }

        return repository.addTriggerExpression({
            guildId,
            expression: cleanExpression.slice(0, 100),
            normalizedExpression,
            createdBy,
            createdAt: new Date().toISOString()
        });
    }

    removeTriggerExpression(guildId, expression) {
        return repository.removeTriggerExpression(
            guildId,
            this.normalizeTriggerExpression(expression)
        );
    }

    matchesTriggerExpression(guildId, content) {
        const normalizedContent = this.normalizeTriggerExpression(content);
        return this.getTriggerExpressions(guildId).some(trigger =>
            normalizedContent.includes(trigger.normalized_expression)
        );
    }

    matchesClosureExpression(content) {
        const normalizedContent = this.normalizeTriggerExpression(content);
        return ["fin de scene", "retour timeline"].some(expression =>
            normalizedContent.includes(expression)
        );
    }

    createScene({
        guildId,
        contextId = null,
        title,
        channelId,
        createdBy = null,
        startedAt = new Date().toISOString()
    }) {
        return repository.createSceneWithChannel({
            id: `scenev2_${randomUUID()}`,
            guildId,
            contextId,
            channelId,
            title: String(title || "Scène RP").trim().slice(0, 100),
            createdBy,
            startedAt
        });

    }

    getScene(sceneId, scope = null) {
        if (scope) return repository.getSceneInContext(sceneId, scope);
        return repository.getScene(sceneId);
    }

    resolveContext(guildId, contextId = null, options) {
        return repository.resolveContext(guildId, contextId, options);
    }

    getContexts(guildId) { return repository.getContexts(guildId); }

    getBoundSceneContext(guildId, channelId) { return repository.getBoundSceneContext(guildId, channelId); }

    getScenes(guildId, contextId = null) {
        return repository.getScenes(guildId, contextId);
    }

    getActiveSceneByChannel(guildId, channelId, contextId = null) {
        return repository.getActiveSceneByChannel(guildId, channelId, contextId);
    }

    getActiveScenes(guildId, contextId = null) {
        return repository.getActiveScenes(guildId, contextId);
    }

    proposeSceneStart({
        guildId,
        contextId = null,
        channelId,
        messageId,
        characterId = null,
        proposedAt = new Date().toISOString()
    }) {
        return repository.saveStartProposal({
            guildId,
            contextId,
            channelId,
            messageId,
            characterId,
            proposedAt
        });
    }

    getStartProposalByMessage(messageId) {
        return repository.getStartProposalByMessage(messageId);
    }

    getPendingStartProposal(guildId, channelId) {
        return repository.getPendingStartProposal(guildId, channelId);
    }

    resolveStartProposal(guildId, channelId, status = "started") {
        return repository.resolveStartProposal(guildId, channelId, status);
    }

    shouldPrompt(guildId, channelId, now = new Date()) {
        const cooldownSince = new Date(
            now.getTime() - 24 * 60 * 60 * 1000
        ).toISOString();

        return repository.claimPrompt(
            guildId,
            channelId,
            now.toISOString(),
            cooldownSince
        );
    }

    moveSceneIfCurrent(data) {
        return repository
            .moveSceneIfCurrent({
                ...data,
                movedAt:
                    data.movedAt
                    || new Date()
                        .toISOString()
            });
    }

    recordSceneMessage(sceneId, occurredAt = new Date().toISOString(), scope = null) {
        return repository.recordSceneMessage(sceneId, occurredAt, scope);
    }

    getPendingClosurePrompt(sceneId) {
        return repository.getPendingClosurePrompt(sceneId);
    }

    getClosurePromptByMessage(messageId) {
        return repository.getClosurePromptByMessage(messageId);
    }

    getInactiveScenes(now = new Date()) {
        return repository.getInactiveScenes(now.toISOString());
    }

    saveClosurePrompt(data) {
        return repository.saveClosurePrompt({
            ...data,
            promptedAt: data.promptedAt || new Date().toISOString()
        });
    }

    resolveClosurePrompt(sceneId, status, scope = null) {
        return repository.resolveClosurePrompt(
            sceneId,
            status,
            new Date().toISOString(),
            scope
        );
    }

    addClosureVote(sceneId, discordUserId, scope = null) {
        return repository.addClosureVote(
            sceneId,
            discordUserId,
            new Date().toISOString(),
            scope
        );
    }

    isSceneParticipantUser(sceneId, discordUserId) {
        return repository.isSceneParticipantUser(sceneId, discordUserId);
    }

    keepSceneOpen(sceneId, scope = null) {
        const now = new Date().toISOString();
        repository.touchScene(sceneId, now, scope);
        repository.resolveClosurePrompt(sceneId, "cancelled", now, scope);
        return repository.getScene(sceneId);
    }

    closeScene(
        sceneId,
        {
            requirePendingPrompt = false,
            ...scope
        } = {}
    ) {
        const now = new Date().toISOString();
        return repository.closeScene(
            sceneId,
            now,
            requirePendingPrompt,
            scope
        );
    }

    markSceneConclude(sceneId, notifiedAt = new Date().toISOString(), scope = null) {
        return repository.markSceneConclude(sceneId, notifiedAt, scope);
    }

    restartScene(sceneId, startedAt = new Date().toISOString(), scope = null) {
        return repository.restartScene(sceneId, startedAt, scope);
    }

    addParticipant(sceneId, characterId, joinedAt = new Date().toISOString(), scope = null) {
        return repository.addParticipant(sceneId, characterId, joinedAt, scope);
    }

    getActiveSceneForCharacter(guildId, characterId, contextId = null) {
        return repository.getActiveSceneForCharacter(guildId, characterId, contextId);
    }

    claimTimelineWarning(sceneAId, sceneBId, characterId) {
        return repository.claimTimelineWarning(
            sceneAId,
            sceneBId,
            characterId,
            new Date().toISOString()
        );
    }

    getConfiguration(guildId) {
        return repository.getConfiguration(guildId);
    }

    configure({
        guildId,
        durationDays,
        recommendedMessageCount,
        inactivityHours = 48
    }) {
        this.assertThresholds({
            durationDays,
            recommendedMessageCount
        });

        return repository.saveConfiguration({
            guildId,
            isEnabled: true,
            durationDays,
            recommendedMessageCount,
            inactivityHours,
            updatedAt: new Date().toISOString()
        });
    }

    disable(guildId) {
        const configuration = this.getConfiguration(guildId);

        if (!configuration) {
            return null;
        }

        return repository.saveConfiguration({
            guildId,
            isEnabled: false,
            durationDays: configuration.duration_days,
            recommendedMessageCount:
                configuration.recommended_message_count,
            inactivityHours:
                configuration.inactivity_hours || 48,
            updatedAt: new Date().toISOString()
        });
    }

    getScopes(guildId) {
        return repository.getScopes(guildId);
    }

    addScope({
        guildId,
        channelId,
        createdBy
    }) {
        return repository.addScope({
            guildId,
            channelId,
            createdBy,
            createdAt: new Date().toISOString()
        });
    }

    removeScope(guildId, channelId) {
        return repository.removeScope(guildId, channelId);
    }

    getCycle(guildId, channelId, contextId = null) {
        return repository.getCycle(guildId, channelId, contextId);
    }

    recordMessage({
        guildId,
        contextId = null,
        channelId,
        occurredAt = new Date().toISOString()
    }) {
        return repository.recordMessage({
            guildId,
            contextId,
            channelId,
            occurredAt
        });
    }

    startNewCycle({
        guildId,
        contextId = null,
        channelId,
        startedAt = new Date().toISOString()
    }) {
        return repository.startNewCycle({
            guildId,
            contextId,
            channelId,
            startedAt
        });
    }

    markConclude({
        guildId,
        contextId = null,
        channelId,
        notifiedAt = new Date().toISOString()
    }) {
        return repository.markConclude({
            guildId,
            contextId,
            channelId,
            notifiedAt
        });
    }

    assertThresholds({
        durationDays,
        recommendedMessageCount
    }) {
        if (
            durationDays == null
            && recommendedMessageCount == null
        ) {
            throw new Error(
                "Configure une dur\u00e9e, un nombre de messages, ou les deux."
            );
        }

        if (
            durationDays != null
            && (
                !Number.isInteger(durationDays)
                || durationDays < 1
            )
        ) {
            throw new Error(
                "La dur\u00e9e recommand\u00e9e doit \u00eatre un nombre entier d'au moins un jour."
            );
        }

        if (
            recommendedMessageCount != null
            && (
                !Number.isInteger(recommendedMessageCount)
                || recommendedMessageCount < 1
            )
        ) {
            throw new Error(
                "Le nombre de messages recommand\u00e9 doit \u00eatre au moins \u00e9gal \u00e0 1."
            );
        }
    }

}

module.exports =
    new SceneAssistantV2Manager();
