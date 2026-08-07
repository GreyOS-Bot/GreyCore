const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

test("les paramètres avancés du centre staff remplacent config set et get", context => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    context.after(() => isolated.cleanup());
    isolated.database.prepare(`
        INSERT INTO Guilds (id, name, created_at)
        VALUES ('guild-settings', 'Greyline', '2026-08-07')
    `).run();

    for (const modulePath of [
        "../src/v2/repositories/GuildAdvancedSettingRepository",
        "../src/v2/managers/GuildAdvancedSettingV2Manager"
    ]) {
        delete require.cache[require.resolve(modulePath)];
    }

    const manager = require("../src/v2/managers/GuildAdvancedSettingV2Manager");
    manager.set("guild-settings", "univers", "Greyline/Backline");
    manager.set("guild-settings", "univers", "Greyline");

    assert.deepEqual(
        manager.getAll("guild-settings").map(setting => ({
            key: setting.setting_key,
            value: setting.setting_value
        })),
        [{ key: "univers", value: "Greyline" }]
    );

    manager.remove("guild-settings", "univers");
    assert.deepEqual(manager.getAll("guild-settings"), []);
});
