const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

test("un masque reste relié à un PJ du même propriétaire et peut être corrigé", () => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    try {
        for (const modulePath of [
            "../src/v2/repositories/CharacterRepository",
            "../src/v2/managers/CharacterV2Manager"
        ]) delete require.cache[require.resolve(modulePath)];

        const now = new Date().toISOString();
        const ownerId = isolated.database.prepare(`
            INSERT INTO UsersV2 (discord_user_id, created_at, updated_at)
            VALUES ('owner', ?, ?)
        `).run(now, now).lastInsertRowid;
        const otherOwnerId = isolated.database.prepare(`
            INSERT INTO UsersV2 (discord_user_id, created_at, updated_at)
            VALUES ('other', ?, ?)
        `).run(now, now).lastInsertRowid;
        const manager = require("../src/v2/managers/CharacterV2Manager");
        const primary = manager.create({ ownerUserId: ownerId, proxyName: "Reya", characterType: "personnage_joue" });
        const secondPrimary = manager.create({ ownerUserId: ownerId, proxyName: "Reya civile", characterType: "personnage_joue" });
        const foreignPrimary = manager.create({ ownerUserId: otherOwnerId, proxyName: "Autre", characterType: "personnage_joue" });
        const masked = manager.create({
            ownerUserId: ownerId,
            proxyName: "Reya masquée",
            characterType: "pj_masque",
            maskedParentCharacterId: primary.id
        });

        assert.equal(masked.masked_parent_character_id, primary.id);
        assert.equal(manager.setMaskedParent(masked.id, secondPrimary.id).masked_parent_character_id, secondPrimary.id);
        assert.throws(() => manager.setMaskedParent(masked.id, foreignPrimary.id), /même utilisateur/);
        assert.throws(() => manager.create({ ownerUserId: ownerId, proxyName: "Sans lien", characterType: "pj_masque" }), /PJ principal/);
    } finally {
        isolated.cleanup();
    }
});
