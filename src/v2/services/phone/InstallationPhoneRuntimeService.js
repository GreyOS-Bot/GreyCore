const phones = require("../../managers/InstallationPhoneV2Manager");
const repository = require("../../repositories/InstallationPhoneRuntimeRepository");
const { RINGING_CALL_MAXIMUM_AGE_SECONDS } = require("../../managers/phoneCall/PhoneCallConstants");

function scope(options, forWrite = true) {
    const context = repository.getContext(options.contextId, options.guildId);
    if (!context) throw new Error("Context introuvable dans cette Guild.");
    if (forWrite && !context.is_active) throw new Error("Ce Context est inactif.");
    return { guildId: String(options.guildId), contextId: context.id, context };
}

function requirePhone(phoneId, options, forWrite = true) {
    const current = scope(options, forWrite);
    return phones.requirePhoneInstallationInContext(phoneId, current.guildId, current.contextId, { forWrite });
}

function addContact(options) {
    const owner = requirePhone(options.phoneId, options);
    let linked = null;
    if (options.linkedPhoneId) {
        linked = requirePhone(options.linkedPhoneId, options);
    }
    const now = options.createdAt || new Date().toISOString();
    return repository.runInTransaction(() => {
        const id = repository.insertContact({
            ...options, phoneId: owner.id, linkedPhoneId: linked?.id || null,
            phoneNumber: options.phoneNumber || linked?.phone_number || null, createdAt: now
        });
        return repository.getContact(id);
    });
}

function removeContact(options) {
    const owner = requirePhone(options.phoneId, options);
    const contact = repository.getContact(options.contactId);
    if (!contact || contact.phone_id !== owner.id) throw new Error("Contact introuvable dans ce Context.");
    repository.deleteContact(contact.id);
}

function listContacts(options) {
    const phone = requirePhone(options.phoneId, options, false);
    return repository.getContacts(phone.id);
}

function getOrCreatePrivateConversation(options) {
    const { caller, receiver } = phones.requireCompatiblePhones(
        options.phoneAId, options.phoneBId, options
    );
    const phoneAId = Math.min(caller.id, receiver.id);
    const phoneBId = Math.max(caller.id, receiver.id);
    const existing = repository.getPrivateConversation(phoneAId, phoneBId);
    if (existing) return existing;
    const now = options.createdAt || new Date().toISOString();
    return repository.runInTransaction(() => {
        const id = repository.insertPrivateConversation({
            ...options, ownerPhoneId: caller.id, phoneAId, phoneBId, createdAt: now
        });
        repository.insertParticipant(id, caller.id, true, now);
        repository.insertParticipant(id, receiver.id, false, now);
        return repository.getConversation(id);
    });
}

function createGroup(options) {
    const owner = requirePhone(options.ownerPhoneId, options);
    const members = Array.from(new Set(options.phoneIds || []))
        .filter(id => Number(id) !== owner.id)
        .map(id => requirePhone(id, options));
    const external = options.externalParticipants || [];
    if (1 + members.length + external.length < 3) {
        throw new Error("Un groupe doit contenir au moins trois participants.");
    }
    const now = options.createdAt || new Date().toISOString();
    return repository.runInTransaction(() => {
        const id = repository.insertGroupConversation({ ...options,
            ownerPhoneId: owner.id, createdAt: now });
        repository.insertParticipant(id, owner.id, true, now);
        for (const member of members) repository.insertParticipant(id, member.id, false, now);
        for (const participant of external) repository.insertExternalParticipant(id, participant, now);
        return repository.getConversation(id);
    });
}

function requireConversation(options, forWrite = true) {
    const phone = requirePhone(options.phoneId, options, forWrite);
    const conversation = repository.getConversation(options.conversationId);
    if (!conversation || conversation.guild_id !== String(options.guildId)
        || conversation.context_id !== options.contextId
        || !repository.getConversationParticipant(conversation.id, phone.id)) {
        throw new Error("Conversation introuvable dans ce Context.");
    }
    return { phone, conversation };
}

function sendMessage(options) {
    const { phone, conversation } = requireConversation(options);
    const now = options.createdAt || new Date().toISOString();
    return repository.runInTransaction(() => {
        const id = repository.insertMessage({ ...options, senderPhoneId: phone.id, createdAt: now });
        repository.touchConversation(conversation.id, now);
        return repository.getMessages(conversation.id).find(message => Number(message.id) === Number(id));
    });
}

function listConversations(options) {
    const phone = requirePhone(options.phoneId, options, false);
    return repository.getConversations(phone.id);
}

function listMessages(options) {
    const { conversation } = requireConversation(options, false);
    return repository.getMessages(conversation.id);
}

function createCall(options) {
    const current = scope(options);
    const { caller, receiver } = phones.requireCompatiblePhones(
        options.callerPhoneId, options.receiverPhoneId, current
    );
    const now = options.createdAt || new Date().toISOString();
    const limitDate = new Date(new Date(now).getTime() - RINGING_CALL_MAXIMUM_AGE_SECONDS * 1000).toISOString();
    return repository.runInTransaction(() => {
        repository.expireStaleRingingCalls(limitDate, now);
        const id = repository.insertCall({ ...current, callerPhoneId: caller.id, receiverPhoneId: receiver.id, createdAt: now });
        return repository.getCall(id);
    });
}

function requireCallParticipant(options) {
    const phone = requirePhone(options.phoneId, options, options.forWrite !== false);
    const call = repository.getCall(options.callId);
    if (!call || call.guild_id !== String(options.guildId) || call.context_id !== options.contextId
        || (call.caller_phone_id !== phone.id && call.receiver_phone_id !== phone.id)) {
        throw new Error("Appel introuvable dans ce Context.");
    }
    return { phone, call };
}

function transitionCall(options) {
    const { call } = requireCallParticipant(options);
    const allowedActor = options.action === "accept" || options.action === "refuse"
        ? call.receiver_phone_id : null;
    if (allowedActor && allowedActor !== options.phoneId) throw new Error("Action non autorisée pour ce participant.");
    const transitions = {
        accept: ["ringing", "accepted"], refuse: ["ringing", "refused"],
        cancel: ["ringing", "cancelled"], hangup: ["accepted", "ended"]
    };
    const transition = transitions[options.action];
    if (!transition || call.status !== transition[0]) throw new Error("Transition d’appel invalide.");
    const at = options.occurredAt || new Date().toISOString();
    repository.transitionCall(call.id, transition[0], transition[1], at);
    return repository.getCall(call.id);
}

function listCallHistory(options) {
    const phone = requirePhone(options.phoneId, options, false);
    return repository.getCallHistory(phone.id);
}

function addCallMessage(options) {
    const { phone, call } = requireCallParticipant(options);
    if (call.status !== "accepted") throw new Error("Cet appel n’est pas en cours.");
    const content = String(options.content || "").trim();
    if (!content) throw new Error("Le message ne peut pas être vide.");
    const id = repository.insertCallMessage(call.id, phone.id, content,
        options.createdAt || new Date().toISOString());
    return repository.getCallMessage(id);
}

function expireStaleRingingCalls(now = new Date()) {
    const endedAt = now.toISOString();
    const limitDate = new Date(now.getTime() - RINGING_CALL_MAXIMUM_AGE_SECONDS * 1000).toISOString();
    return repository.expireStaleRingingCalls(limitDate, endedAt);
}

function reconcileInterruptedCalls(startupCutoff, recoveryAt = new Date().toISOString()) {
    return repository.reconcileInterruptedCalls(startupCutoff, recoveryAt);
}

module.exports = {
    addContact, removeContact, listContacts,
    getOrCreatePrivateConversation, createGroup, sendMessage, listConversations, listMessages,
    createCall, requireCallParticipant, transitionCall, listCallHistory, addCallMessage,
    expireStaleRingingCalls, reconcileInterruptedCalls
};
