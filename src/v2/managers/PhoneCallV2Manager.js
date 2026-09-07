const reader =
    require(
        "./phoneCall/PhoneCallReader"
    );

const creationManager =
    require(
        "./phoneCall/PhoneCallCreationManager"
    );

const transitionManager =
    require(
        "./phoneCall/PhoneCallTransitionManager"
    );

const messageManager =
    require(
        "./phoneCall/PhoneCallMessageManager"
    );

class PhoneCallV2Manager {

    reconcileInterruptedCalls(
        startupCutoff
    ) {
        return transitionManager
            .reconcileInterruptedCalls(
                startupCutoff
            );
    }

    expireStaleRingingCalls(
        maximumAgeSeconds = 30
    ) {
        return transitionManager
            .expireStaleRingingCalls(
                maximumAgeSeconds
            );
    }

    getById(
        callId
    ) {
        if (Number(callId) >= 1000000000) return require("../repositories/InstallationPhoneRuntimeRepository").getCall(callId);
        return reader.getById(
            callId
        );
    }

    getActiveForPhone(
        phoneId
    ) {
        if (Number(phoneId) >= 1000000000) return require("../repositories/InstallationPhoneRuntimeRepository").getActiveCall(phoneId);
        return reader
            .getActiveForPhone(
                phoneId
            );
    }

    getHistoryForPhone(
        phoneId,
        limit = 50
    ) {
        if (Number(phoneId) >= 1000000000) return require("../repositories/InstallationPhoneRuntimeRepository").getCallHistory(phoneId).slice(0, limit);
        return reader
            .getHistoryForPhone(
                phoneId,
                limit
            );
    }

    createCall(
        data
    ) {
        if (Number(data.callerPhoneId) >= 1000000000) {
            const phone = require("./InstallationPhoneV2Manager").getById(data.callerPhoneId);
            return require("../services/phone/InstallationPhoneRuntimeService").createCall({
                guildId: phone.guild_id, contextId: phone.context_id, ...data
            });
        }
        return creationManager
            .createCall(
                data
            );
    }

    acceptCall(
        callId,
        phoneId
    ) {
        if (Number(callId) >= 1000000000) return require("./PhoneV2Manager").acceptCall(callId, phoneId);
        return transitionManager
            .acceptCall(
                callId
            );
    }

    refuseCall(
        callId,
        phoneId
    ) {
        if (Number(callId) >= 1000000000) return require("./PhoneV2Manager").refuseCall(callId, phoneId);
        return transitionManager
            .refuseCall(
                callId
            );
    }

    cancelCall(
        callId,
        phoneId
    ) {
        if (Number(callId) >= 1000000000) return require("./PhoneV2Manager").cancelCall(callId, phoneId);
        return transitionManager
            .cancelCall(
                callId
            );
    }

    markMissed(
        callId
    ) {
        if (Number(callId) >= 1000000000) return require("./PhoneV2Manager").markMissed(callId);
        return transitionManager
            .markMissed(
                callId
            );
    }

    createMessage(
        data
    ) {
        if (Number(data.callId) >= 1000000000) {
            const call = require("../repositories/InstallationPhoneRuntimeRepository").getCall(data.callId);
            return require("../services/phone/InstallationPhoneRuntimeService").addCallMessage({
                guildId: call.guild_id, contextId: call.context_id,
                phoneId: data.speakerPhoneId, ...data
            });
        }
        return messageManager
            .createMessage(
                data
            );
    }

    getMessages(
        callId
    ) {
        if (Number(callId) >= 1000000000) return require("../repositories/InstallationPhoneRuntimeRepository").getCallMessages(callId);
        return messageManager
            .getMessages(
                callId
            );
    }

    endCall(
        callId,
        phoneId
    ) {
        if (Number(callId) >= 1000000000) return require("./PhoneV2Manager").endCall(callId, phoneId);
        return transitionManager
            .endCall(
                callId
            );
    }
}

module.exports =
    new PhoneCallV2Manager();
