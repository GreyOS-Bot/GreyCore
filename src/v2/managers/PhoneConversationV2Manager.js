const repository =
    require(
        "./phoneConversation/PhoneConversationRepository"
    );

const creationManager =
    require(
        "./phoneConversation/PhoneConversationCreationManager"
    );

const participantManager =
    require(
        "./phoneConversation/PhoneConversationParticipantManager"
    );

const reader =
    require(
        "./phoneConversation/PhoneConversationReader"
    );

class PhoneConversationV2Manager {

    getById(
        conversationId
    ) {
        if (Number(conversationId) >= 1000000000) {
            const scoped = require("../repositories/InstallationPhoneRuntimeRepository")
                .getConversation(conversationId);
            if (scoped) return scoped;
        }
        return repository.getById(
            conversationId
        );
    }

    getParticipantById(
        participantId
    ) {
        return repository
            .getParticipantById(
                participantId
            );
    }

    getParticipants(
        conversationId
    ) {
        if (Number(conversationId) >= 1000000000) {
            const runtime = require("../repositories/InstallationPhoneRuntimeRepository");
            return runtime.getConversationParticipants(conversationId);
        }
        return repository
            .getParticipants(
                conversationId
            );
    }

    getParticipant(
        conversationId,
        phoneId
    ) {
        if (Number(conversationId) >= 1000000000) {
            const runtime = require("../repositories/InstallationPhoneRuntimeRepository");
            return runtime.getConversationParticipant(conversationId, phoneId);
        }
        return repository
            .getParticipant(
                conversationId,
                phoneId
            );
    }

    isParticipant(
        conversationId,
        phoneId
    ) {
        return Boolean(
            this.getParticipant(
                conversationId,
                phoneId
            )
        );
    }

    getPrivateBetweenPhones(
        phoneAId,
        phoneBId
    ) {
        const orderedPhoneA =
            Math.min(
                phoneAId,
                phoneBId
            );

        const orderedPhoneB =
            Math.max(
                phoneAId,
                phoneBId
            );

        return repository
            .getPrivateBetweenPhones(
                orderedPhoneA,
                orderedPhoneB
            );
    }

    createPrivate(
        phoneAId,
        phoneBId
    ) {
        return creationManager
            .createPrivate(
                phoneAId,
                phoneBId
            );
    }

    createGroup(
        data
    ) {
        if (Number(data.ownerPhoneId) >= 1000000000) {
            const phone = require("./InstallationPhoneV2Manager").getById(data.ownerPhoneId);
            return require("../services/phone/InstallationPhoneRuntimeService").createGroup({
                guildId: phone.guild_id, contextId: phone.context_id, ...data
            });
        }
        return creationManager
            .createGroup(
                data
            );
    }

    addGreycoreParticipant(
        conversationId,
        phoneId,
        options = {}
    ) {
        return participantManager
            .addGreycoreParticipant(
                conversationId,
                phoneId,
                options
            );
    }

    addExternalParticipant(
        conversationId,
        data,
        options = {}
    ) {
        return participantManager
            .addExternalParticipant(
                conversationId,
                data,
                options
            );
    }

    removeParticipant(
        conversationId,
        participantId
    ) {
        return participantManager
            .removeParticipant(
                conversationId,
                participantId
            );
    }

    rename(
        conversationId,
        name
    ) {
        return creationManager.rename(
            conversationId,
            name
        );
    }

    getForPhone(
        phoneId
    ) {
        if (Number(phoneId) >= 1000000000) {
            return require("../repositories/InstallationPhoneRuntimeRepository")
                .getConversations(phoneId);
        }
        return reader.getForPhone(
            phoneId
        );
    }

    getDisplayName(
        conversation,
        viewerPhoneId
    ) {
        return reader.getDisplayName(
            conversation,
            viewerPhoneId
        );
    }

    getOtherParticipant(
        conversationId,
        phoneId
    ) {
        return reader
            .getOtherParticipant(
                conversationId,
                phoneId
            );
    }

    ensureLegacyParticipants(
        conversationId
    ) {
        return participantManager
            .ensureLegacyParticipants(
                conversationId
            );
    }

    touch(
        conversationId
    ) {
        return repository.touch(
            conversationId
        );
    }

    getMessages(
        conversationId,
        limit = 50
    ) {
        return reader.getMessages(
            conversationId,
            limit
        );
    }
}

module.exports =
    new PhoneConversationV2Manager();
