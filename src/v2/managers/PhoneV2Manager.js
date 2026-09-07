const repository =
    require(
        "./phone/PhoneRepository"
    );

const lifecycleManager =
    require(
        "./phone/PhoneLifecycleManager"
    );

const conversationGateway =
    require(
        "./phone/PhoneConversationGateway"
    );

const messageCoordinator =
    require(
        "./phone/PhoneMessageCoordinator"
    );

const callGateway =
    require(
        "./phone/PhoneCallGateway"
    );

class PhoneV2Manager {

    isInstallationRuntimeId(id) {
        return Number(id) >= 1000000000;
    }

    get installationRepository() {
        return require("../repositories/InstallationPhoneRepository");
    }

    get runtimeRepository() {
        return require("../repositories/InstallationPhoneRuntimeRepository");
    }

    get runtimeService() {
        return require("../services/phone/InstallationPhoneRuntimeService");
    }

    getPhoneForInstallation(installationId) {
        return require("./InstallationPhoneV2Manager")
            .getByInstallation(installationId);
    }

    createPhoneForInstallation(installationId, options) {
        return require("./InstallationPhoneV2Manager")
            .createForInstallation(installationId, options);
    }

    getPhoneByNumberInContext(guildId, contextId, phoneNumber) {
        return require("./InstallationPhoneV2Manager")
            .getByNumberInContext(guildId, contextId, phoneNumber);
    }

    requirePhoneInstallationInContext(phoneId, guildId, contextId, options) {
        return require("./InstallationPhoneV2Manager")
            .requirePhoneInstallationInContext(phoneId, guildId, contextId, options);
    }

    getPhoneById(
        phoneId
    ) {
        if (this.isInstallationRuntimeId(phoneId)) {
            const installationPhone = this.installationRepository.getById(phoneId);
            if (installationPhone) return installationPhone;
        }
        return repository.getPhoneById(
            phoneId
        );
    }

    getPhoneByContinuity(
        continuityId
    ) {
        return repository
            .getPhoneByContinuity(
                continuityId
            );
    }

    getContinuityByPhone(
        phoneId
    ) {
        if (this.isInstallationRuntimeId(phoneId)) {
            const continuity = this.installationRepository.getContinuityByPhone(phoneId);
            if (continuity) return continuity;
        }
        return repository
            .getContinuityByPhone(
                phoneId
            );
    }

    getPhoneByNumber(
        phoneNumber
    ) {
        return repository
            .getPhoneByNumber(
                phoneNumber
            );
    }

    generatePhoneNumber() {
        return lifecycleManager
            .generatePhoneNumber();
    }

    createPhone(
        data
    ) {
        return lifecycleManager
            .createPhone(
                data
            );
    }

    setActive(
        phoneId,
        isActive
    ) {
        return lifecycleManager
            .setActive(
                phoneId,
                isActive
            );
    }

    getConversationById(
        conversationId
    ) {
        if (this.isInstallationRuntimeId(conversationId)) {
            const scoped = this.runtimeRepository.getConversation(conversationId);
            if (scoped) return scoped;
        }
        return conversationGateway
            .getConversationById(
                conversationId
            );
    }

    getConversationBetweenPhones(
        phoneAId,
        phoneBId
    ) {
        if (this.isInstallationRuntimeId(phoneAId) || this.isInstallationRuntimeId(phoneBId)) {
            const phoneA = this.installationRepository.getById(phoneAId);
            const phoneB = this.installationRepository.getById(phoneBId);
            if (!phoneA || !phoneB || phoneA.guild_id !== phoneB.guild_id || phoneA.context_id !== phoneB.context_id) {
                return null;
            }
            return this.runtimeRepository.getPrivateConversation(
                Math.min(phoneA.id, phoneB.id), Math.max(phoneA.id, phoneB.id)
            );
        }
        return conversationGateway
            .getConversationBetweenPhones(
                phoneAId,
                phoneBId
            );
    }

    getOrCreateConversation(
        phoneAId,
        phoneBId
    ) {
        if (this.isInstallationRuntimeId(phoneAId) || this.isInstallationRuntimeId(phoneBId)) {
            const phoneA = this.installationRepository.getById(phoneAId);
            const phoneB = this.installationRepository.getById(phoneBId);
            if (!phoneA || !phoneB) throw new Error("Phones incompatibles.");
            return this.runtimeService.getOrCreatePrivateConversation({
                guildId: phoneA.guild_id, contextId: phoneA.context_id,
                phoneAId, phoneBId
            });
        }
        return conversationGateway
            .getOrCreateConversation(
                phoneAId,
                phoneBId
            );
    }

    getConversationsForPhone(
        phoneId
    ) {
        if (this.isInstallationRuntimeId(phoneId)) {
            const phone = this.installationRepository.getById(phoneId);
            return this.runtimeService.listConversations({
            guildId: phone.guild_id, contextId: phone.context_id, phoneId
            });
        }
        return conversationGateway
            .getConversationsForPhone(
                phoneId
            );
    }

    getMessages(
        conversationId,
        limit = 50
    ) {
        if (this.isInstallationRuntimeId(conversationId)) {
            return this.runtimeRepository.getMessages(conversationId).slice(-limit);
        }
        return conversationGateway
            .getMessages(
                conversationId,
                limit
            );
    }

    getMessageById(
        messageId
    ) {
        if (this.isInstallationRuntimeId(messageId)) {
            const scoped = this.runtimeRepository.getMessage(messageId);
            if (scoped) return scoped;
        }
        return messageCoordinator
            .getMessageById(
                messageId
            );
    }

    getForConversation(
        conversationId,
        limit = 50
    ) {
        if (this.isInstallationRuntimeId(conversationId)) {
            return this.runtimeRepository.getMessages(conversationId).slice(-limit);
        }
        return messageCoordinator
            .getForConversation(
                conversationId,
                limit
            );
    }

    deleteMessage(
        messageId
    ) {
        if (this.isInstallationRuntimeId(messageId)) {
            return this.runtimeRepository.deleteMessage(messageId);
        }
        return messageCoordinator
            .deleteMessage(
                messageId
            );
    }

    createMessage(
        data
    ) {
        if (this.isInstallationRuntimeId(data.senderPhoneId)) {
            const conversation = this.runtimeRepository.getConversation(data.conversationId);
            if (!conversation) throw new Error("Conversation runtime introuvable.");
            return this.runtimeService.sendMessage({
            guildId: conversation.guild_id, contextId: conversation.context_id,
            phoneId: data.senderPhoneId, ...data
            });
        }
        return messageCoordinator
            .createMessage(
                data
            );
    }

    updateMessagePublication(
        messageId,
        data
    ) {
        if (this.isInstallationRuntimeId(messageId)) {
            return this.runtimeRepository.updateMessagePublication(messageId, data);
        }
        return messageCoordinator
            .updateMessagePublication(
                messageId,
                data
            );
    }

    getCallById(
        callId
    ) {
        if (this.isInstallationRuntimeId(callId)) {
            const scoped = this.runtimeRepository.getCall(callId);
            if (scoped) return scoped;
        }
        return callGateway.getCallById(
            callId
        );
    }

    getActiveCall(
        phoneId
    ) {
        if (this.isInstallationRuntimeId(phoneId)) {
            return this.runtimeRepository.getActiveCall(phoneId);
        }
        return callGateway.getActiveCall(
            phoneId
        );
    }

    getCallHistory(
        phoneId,
        limit = 50
    ) {
        if (this.isInstallationRuntimeId(phoneId)) {
            const phone = this.installationRepository.getById(phoneId);
            return this.runtimeService.listCallHistory({
            guildId: phone.guild_id, contextId: phone.context_id, phoneId
            }).slice(0, limit);
        }
        return callGateway
            .getCallHistory(
                phoneId,
                limit
            );
    }

    createCall(
        data
    ) {
        if (this.isInstallationRuntimeId(data.callerPhoneId)) {
            const caller = this.installationRepository.getById(data.callerPhoneId);
            return this.runtimeService.createCall({
            guildId: caller.guild_id, contextId: caller.context_id, ...data
            });
        }
        return callGateway.createCall(
            data
        );
    }

    acceptCall(
        callId,
        phoneId
    ) {
        if (this.isInstallationRuntimeId(callId)) {
            const call = this.runtimeRepository.getCall(callId);
            if (!call) throw new Error("Appel runtime introuvable.");
            return this.runtimeService.transitionCall({ guildId: call.guild_id, contextId: call.context_id,
                phoneId, callId, action: "accept" });
        }
        return callGateway.acceptCall(
            callId
        );
    }

    refuseCall(
        callId,
        phoneId
    ) {
        if (this.isInstallationRuntimeId(callId)) {
            const call = this.runtimeRepository.getCall(callId);
            if (!call) throw new Error("Appel runtime introuvable.");
            return this.runtimeService.transitionCall({ guildId: call.guild_id, contextId: call.context_id,
                phoneId, callId, action: "refuse" });
        }
        return callGateway.refuseCall(
            callId
        );
    }

    cancelCall(
        callId,
        phoneId
    ) {
        if (this.isInstallationRuntimeId(callId)) {
            const call = this.runtimeRepository.getCall(callId);
            if (!call) throw new Error("Appel runtime introuvable.");
            return this.runtimeService.transitionCall({ guildId: call.guild_id, contextId: call.context_id,
                phoneId, callId, action: "cancel" });
        }
        return callGateway.cancelCall(
            callId
        );
    }

    markMissed(
        callId
    ) {
        if (this.isInstallationRuntimeId(callId)) {
            this.runtimeRepository.transitionCall(callId, "ringing", "missed", new Date().toISOString());
            return this.runtimeRepository.getCall(callId);
        }
        return callGateway.markMissed(
            callId
        );
    }

    endCall(
        callId,
        phoneId
    ) {
        if (this.isInstallationRuntimeId(callId)) {
            const call = this.runtimeRepository.getCall(callId);
            if (!call) throw new Error("Appel runtime introuvable.");
            return this.runtimeService.transitionCall({ guildId: call.guild_id, contextId: call.context_id,
                phoneId, callId, action: "hangup" });
        }
        return callGateway.endCall(
            callId
        );
    }

    expireStaleRingingCalls(
        maximumAgeSeconds = 30
    ) {
        return callGateway
            .expireStaleRingingCalls(
                maximumAgeSeconds
            );
    }
}

module.exports =
    new PhoneV2Manager();
