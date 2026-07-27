class PhoneCallSessionManager {

    constructor() {

        this.sessions =
            new Map();

    }

    register(
        callId,
        data
    ) {

        const id =
            Number(callId);

        const current =
            this.sessions.get(id)
            || {};

        this.sessions.set(
            id,
            {
                ...current,
                ...data
            }
        );

        return this.sessions.get(id);

    }

    get(
        callId
    ) {

        return this.sessions.get(
            Number(callId)
        );

    }

    setTimeout(
        callId,
        timeout
    ) {

        this.register(
            callId,
            {
                timeout
            }
        );

    }

    clearTimeout(
        callId
    ) {

        const session =
            this.get(callId);

        if (
            session?.timeout
        ) {

            clearTimeout(
                session.timeout
            );

        }

    }

    remove(
        callId
    ) {

        this.clearTimeout(
            callId
        );

        this.sessions.delete(
            Number(callId)
        );

    }

}

module.exports =
    new PhoneCallSessionManager();