const MAXIMUM_PARTICIPANTS =
    25;

const DRAFT_LIFETIME_MS =
    30 * 60 * 1000;

class PhoneGroupDraftService {

    constructor() {
        this.drafts = new Map();
    }

    getKey(
        userId,
        characterId
    ) {
        return `${userId}:${characterId}`;
    }

    get(
        userId,
        characterId
    ) {
        const key =
            this.getKey(
                userId,
                characterId
            );

        const draft =
            this.drafts.get(key)
            || null;

        if (
            draft
            && Date.now() - draft.updatedAt >
                DRAFT_LIFETIME_MS
        ) {
            this.drafts.delete(key);
            return null;
        }

        return draft;
    }

    start({
        userId,
        characterId,
        ownerPhoneId
    }) {
        const draft = {
            ownerPhoneId:
                Number(ownerPhoneId),
            phoneIds: [],
            name: null,
            updatedAt:
                Date.now()
        };

        this.drafts.set(
            this.getKey(
                userId,
                characterId
            ),
            draft
        );

        return draft;
    }

    ensure({
        userId,
        characterId,
        ownerPhoneId
    }) {
        const draft =
            this.get(
                userId,
                characterId
            );

        if (
            draft
            && Number(draft.ownerPhoneId) ===
                Number(ownerPhoneId)
        ) {
            return draft;
        }

        return this.start({
            userId,
            characterId,
            ownerPhoneId
        });
    }

    addMember({
        userId,
        characterId,
        ownerPhoneId,
        phoneId
    }) {
        const draft =
            this.ensure({
                userId,
                characterId,
                ownerPhoneId
            });

        const memberPhoneId =
            Number(phoneId);

        if (
            !memberPhoneId
            || memberPhoneId ===
                Number(draft.ownerPhoneId)
        ) {
            throw new Error(
                "Vous ne pouvez pas vous ajouter vous-même au groupe."
            );
        }

        if (
            draft.phoneIds.includes(
                memberPhoneId
            )
        ) {
            return draft;
        }

        if (
            draft.phoneIds.length >=
            MAXIMUM_PARTICIPANTS - 1
        ) {
            throw new Error(
                "Un groupe peut compter au maximum 25 participants."
            );
        }

        draft.phoneIds.push(
            memberPhoneId
        );

        draft.updatedAt =
            Date.now();

        return draft;
    }

    removeMember({
        userId,
        characterId,
        phoneId
    }) {
        const draft =
            this.get(
                userId,
                characterId
            );

        if (!draft) {
            return null;
        }

        draft.phoneIds =
            draft.phoneIds.filter(
                memberPhoneId =>
                    Number(memberPhoneId) !==
                    Number(phoneId)
            );

        draft.updatedAt =
            Date.now();

        return draft;
    }

    setName({
        userId,
        characterId,
        ownerPhoneId,
        name
    }) {
        const draft =
            this.ensure({
                userId,
                characterId,
                ownerPhoneId
            });

        draft.name =
            name?.trim()
            || null;

        draft.updatedAt =
            Date.now();

        return draft;
    }

    clear(
        userId,
        characterId
    ) {
        this.drafts.delete(
            this.getKey(
                userId,
                characterId
            )
        );
    }

}

module.exports =
    new PhoneGroupDraftService();
