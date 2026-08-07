const repository = require("../repositories/GuildAdvancedSettingRepository");

class GuildAdvancedSettingV2Manager {
    getAll(guildId) {
        return repository.getAll(String(guildId));
    }

    set(guildId, key, value) {
        const normalizedKey = String(key || "").trim();
        const normalizedValue = String(value || "").trim();
        if (!normalizedKey) throw new Error("La clé du paramètre est obligatoire.");
        if (normalizedKey.length > 100) throw new Error("La clé du paramètre est trop longue.");
        if (!normalizedValue) throw new Error("La valeur du paramètre est obligatoire.");
        if (normalizedValue.length > 4000) throw new Error("La valeur du paramètre est trop longue.");
        return repository.set(String(guildId), normalizedKey, normalizedValue);
    }

    remove(guildId, key) {
        const normalizedKey = String(key || "").trim();
        if (!normalizedKey) throw new Error("La clé du paramètre est obligatoire.");
        return repository.remove(String(guildId), normalizedKey);
    }
}

module.exports = new GuildAdvancedSettingV2Manager();
