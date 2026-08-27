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
        title,
        channelId,
        createdBy = null,
        startedAt = new Date().toISOString()
    }) {
        const scene = repository.createScene({
            id: `scenev2_${randomUUID()}`,
            guildId,
            title: String(title || "Scène RP").trim().slice(0, 100),
            createdBy,
            startedAt
        });

        repository.linkChannel({
            sceneId: scene.id,
            guildId,
            channelId,
            createdBy,
            linkedAt: startedAt
        });

        return repository.getScene(scene.id);
    }

    getScene(sceneId) {
        return repository.getScene(sceneId);
    }

    getActiveSceneByChannel(guildId, channelId) {
        return repository.getActiveSceneByChannel(guildId, channelId);
    }

    getActiveScenes(guildId) {
        return repository.getActiveScenes(guildId);
    }

    proposeSceneStart({
        guildId,
        channelId,
        messageId,
        characterId = null,
        proposedAt = new Date().toISOString()
    }) {
        return repository.saveStartProposal({
            guildId,
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

    moveScene(data) {
        return repository.moveScene({
            ...data,
            movedAt: data.movedAt || new Date().toISOString()
        });
    }

    recordSceneMessage(sceneId, occurredAt = new Date().toISOString()) {
        return repository.recordSceneMessage(sceneId, occurredAt);
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

    resolveClosurePrompt(sceneId, status) {
        return repository.resolveClosurePrompt(
            sceneId,
            status,
            new Date().toISOString()
        );
    }

    addClosureVote(sceneId, discordUserId) {
        return repository.addClosureVote(
            sceneId,
            discordUserId,
            new Date().toISOString()
        );
    }

    isSceneParticipantUser(sceneId, discordUserId) {
        return repository.isSceneParticipantUser(sceneId, discordUserId);
    }

    keepSceneOpen(sceneId) {
        const now = new Date().toISOString();
        repository.touchScene(sceneId, now);
        repository.resolveClosurePrompt(sceneId, "cancelled", now);
        return repository.getScene(sceneId);
    }

    closeScene(
        sceneId,
        {
            requirePendingPrompt = false
        } = {}
    ) {
        const now = new Date().toISOString();
        return repository.closeScene(
            sceneId,
            now,
            requirePendingPrompt
        );
    }

    markSceneConclude(sceneId, notifiedAt = new Date().toISOString()) {
        return repository.markSceneConclude(sceneId, notifiedAt);
    }

    restartScene(sceneId, startedAt = new Date().toISOString()) {
        return repository.restartScene(sceneId, startedAt);
    }

    addParticipant(sceneId, characterId, joinedAt = new Date().toISOString()) {
        return repository.addParticipant(sceneId, characterId, joinedAt);
    }

    getActiveSceneForCharacter(guildId, characterId) {
        return repository.getActiveSceneForCharacter(guildId, characterId);
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

    getCycle(guildId, channelId) {
        return repository.getCycle(guildId, channelId);
    }

    recordMessage({
        guildId,
        channelId,
        occurredAt = new Date().toISOString()
    }) {
        return repository.recordMessage({
            guildId,
            channelId,
            occurredAt
        });
    }

    startNewCycle({
        guildId,
        channelId,
        startedAt = new Date().toISOString()
    }) {
        return repository.startNewCycle({
            guildId,
            channelId,
            startedAt
        });
    }

    markConclude({
        guildId,
        channelId,
        notifiedAt = new Date().toISOString()
    }) {
        return repository.markConclude({
            guildId,
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
