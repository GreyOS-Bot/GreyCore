const repository =
    require(
        "../repositories/SceneAssistantRepository"
    );
const { randomUUID } = require("node:crypto");

class SceneAssistantV2Manager {

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

    moveScene(data) {
        return repository.moveScene({
            ...data,
            movedAt: data.movedAt || new Date().toISOString()
        });
    }

    recordSceneMessage(sceneId, occurredAt = new Date().toISOString()) {
        return repository.recordSceneMessage(sceneId, occurredAt);
    }

    addParticipant(sceneId, characterId, joinedAt = new Date().toISOString()) {
        return repository.addParticipant(sceneId, characterId, joinedAt);
    }

    getActiveSceneForCharacter(guildId, characterId) {
        return repository.getActiveSceneForCharacter(guildId, characterId);
    }

    getConfiguration(guildId) {
        return repository.getConfiguration(guildId);
    }

    configure({
        guildId,
        durationDays,
        recommendedMessageCount
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
