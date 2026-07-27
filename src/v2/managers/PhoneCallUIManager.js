const synchronizer =
    require(
        "./phoneCallUI/PhoneCallSynchronizer"
    );

const sideUpdater =
    require(
        "./phoneCallUI/PhoneCallSideUpdater"
    );

const participantResolver =
    require(
        "./phoneCallUI/PhoneCallParticipantResolver"
    );

class PhoneCallUIManager {

    async refresh(
        callId
    ) {
        return synchronizer.refresh(
            callId
        );
    }

    async refreshSide(
        options
    ) {
        return sideUpdater.refreshSide(
            options
        );
    }

    getContactName(
        phoneId
    ) {
        return participantResolver
            .getContactName(
                phoneId
            );
    }
}

module.exports =
    new PhoneCallUIManager();
