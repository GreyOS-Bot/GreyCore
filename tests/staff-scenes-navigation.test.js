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

test("les compteurs staff continuent au-dela des limites", () => {
    const page = require("../src/v2/pages/staff/StaffScenesPage");
    const progress = page.formatSceneProgress({
        started_at: "2026-08-01T00:00:00.000Z",
        rp_message_count: 137
    }, {
        duration_days: 5,
        recommended_message_count: 100
    }, new Date("2026-08-09T00:00:00.000Z"));

    assert.match(progress, /Jour \*\*9 \/ 5\*\*/);
    assert.match(progress, /Messages \*\*137 \/ 100\*\*/);
    assert.match(progress, /\+4 jour/);
    assert.match(progress, /\+37 message/);
});
