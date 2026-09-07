const repository = require("../repositories/InstallationPhoneRepository");
const installationManager = require("./InstallationV2Manager");

function normalizeScope(guildId, contextId) {
    const context = installationManager.resolveContext(guildId, contextId);
    return { guildId: String(guildId), contextId: context.id, context };
}

function generatePhoneNumber(guildId, contextId) {
    for (let attempt = 0; attempt < 100; attempt++) {
        const phoneNumber = `555-${Math.floor(1000 + Math.random() * 9000)}`;
        if (!repository.getByNumberInContext(guildId, contextId, phoneNumber)) {
            return phoneNumber;
        }
    }
    throw new Error("Impossible de générer un numéro dans ce Context.");
}

function createForInstallation(installationId, options = {}) {
    const existing = repository.getByInstallation(installationId);
    if (existing) return existing;

    const installation = installationManager.requireInstallation(installationId);
    const scope = normalizeScope(installation.guild_id, installation.context_id);
    if (!scope.context.is_active) {
        throw new Error("Impossible de créer un Phone dans un Context inactif.");
    }
    const legacy = repository.getLegacyByContinuity(installation.continuity_id);
    const phoneNumber = options.phoneNumber || legacy?.phone_number
        || generatePhoneNumber(scope.guildId, scope.contextId);
    const collision = repository.getByNumberInContext(
        scope.guildId, scope.contextId, phoneNumber
    );
    if (collision) throw new Error("Ce numéro est déjà utilisé dans ce Context.");
    const now = options.createdAt || new Date().toISOString();
    return repository.insert({
        installationId: installation.id,
        guildId: scope.guildId,
        contextId: scope.contextId,
        continuityId: installation.continuity_id,
        phoneNumber,
        legacyPhoneId: legacy?.id || null,
        isActive: options.isActive === false ? 0 : 1,
        createdAt: now,
        updatedAt: options.updatedAt || now
    });
}

function requirePhoneInstallationInContext(phoneId, guildId, contextId, options = {}) {
    const phone = repository.getById(phoneId);
    const normalizedGuildId = String(guildId);
    if (!phone || phone.guild_id !== normalizedGuildId || phone.context_id !== contextId) {
        throw new Error("Phone introuvable dans ce Context.");
    }
    if (options.forWrite !== false) {
        const scope = normalizeScope(normalizedGuildId, contextId);
        if (phone.context_id !== scope.contextId || !phone.context_is_active) {
            throw new Error("Ce Context est inactif.");
        }
    }
    return phone;
}

function requireCompatiblePhones(callerPhoneId, receiverPhoneId, options) {
    const caller = requirePhoneInstallationInContext(
        callerPhoneId, options.guildId, options.contextId
    );
    const receiver = requirePhoneInstallationInContext(
        receiverPhoneId, options.guildId, options.contextId
    );
    if (caller.id === receiver.id) throw new Error("Un Phone ne peut pas se cibler lui-même.");
    return { caller, receiver };
}

module.exports = {
    createForInstallation,
    generatePhoneNumber,
    getById: repository.getById,
    getByInstallation: repository.getByInstallation,
    getByNumberInContext: repository.getByNumberInContext,
    getContinuityByPhone: repository.getContinuityByPhone,
    listLegacyArchiveByContinuity: repository.listLegacyArchiveByContinuity,
    getLegacyArchive: repository.getLegacyArchive,
    requirePhoneInstallationInContext,
    requireCompatiblePhones
};
