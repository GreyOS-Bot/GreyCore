const test = require("node:test");
const assert = require("node:assert/strict");

test("le retour de la gestion des scenes utilise la route staff enregistree", () => {
    const page = require("../src/v2/pages/staff/StaffScenesPage");
    const payload = page.buildManagement({
        guildId: "guild",
        guild: { channels: { cache: new Map() } }
    });
    const ids = payload.components.flatMap(row =>
        row.toJSON().components.map(component => component.custom_id)
    );

    assert.ok(ids.includes("page:staff:section:scenes"));
    assert.ok(!ids.includes("page:staff:scenes:root"));
});
