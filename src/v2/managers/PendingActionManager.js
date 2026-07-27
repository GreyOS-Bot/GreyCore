class PendingActionManager {

    constructor() {

        this.actions =
            new Map();

    }

    create(action) {

        this.actions.set(
            action.userId,
            {
                ...action,
                createdAt:
                    Date.now()
            }
        );

    }

    get(userId) {

        return this.actions.get(
            userId
        );

    }

    has(userId) {

        return this.actions.has(
            userId
        );

    }

    delete(userId) {

        this.actions.delete(
            userId
        );

    }

    cleanupExpired() {

        const now =
            Date.now();

        for (const [
            userId,
            action
        ] of this.actions) {

            if (
                now -
                action.createdAt >
                5 * 60 * 1000
            ) {

                this.actions.delete(
                    userId
                );

            }

        }

    }

}

module.exports =
    new PendingActionManager();