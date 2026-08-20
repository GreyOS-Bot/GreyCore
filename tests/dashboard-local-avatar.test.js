const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule } = require("./helpers/moduleStub");

test("le dashboard utilise l’avatar local de l’installation sur le serveur", () => {
    stubModule("src/v2/repositories/DashboardRepository.js", {});
    stubModule("src/v2/managers/CharacterV2Manager.js", {
        getById: () => ({
            id: "character",
            avatar_url: "https://image.test/global.png",
            character_type: "personnage_joue"
        })
    });
    stubModule("src/v2/managers/ContinuityV2Manager.js", {
        getById: () => ({ id: "continuity", character_id: "character" }),
        getByCharacter: () => [{ id: "continuity", character_id: "character" }]
    });
    stubModule("src/v2/managers/InstallationV2Manager.js", {
        getByCharacter: () => [{
            id: "installation",
            character_id: "character",
            continuity_id: "continuity",
            guild_id: "guild",
            local_avatar_url: "https://image.test/local.png"
        }],
        getByContinuity: () => []
    });
    stubModule("src/v2/managers/ProfileV2Manager.js", { get: () => null });
    stubModule("src/v2/managers/RelationshipV2Manager.js", { getForContinuity: () => [] });
    stubModule("src/v2/managers/EncounterV2Manager.js", { getForContinuity: () => [] });
    stubModule("src/v2/managers/StateV2Manager.js", { getActiveStates: () => [] });
    stubModule("src/v2/core/character/CharacterTypeCatalog.js", { isNpc: () => false });

    const modulePath = require.resolve("../src/v2/services/dashboard/CharacterDashboardManager");
    delete require.cache[modulePath];
    const manager = require(modulePath);
    const dashboard = manager.getDashboardData("character", { guildId: "guild" });

    assert.equal(dashboard.character.avatar_url, "https://image.test/local.png");
});
