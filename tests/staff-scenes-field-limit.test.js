const test = require("node:test");
const assert = require("node:assert/strict");

test("la liste des scènes respecte la limite d’un champ Discord", () => {
    const { truncateField } = require("../src/v2/pages/staff/StaffScenesPage");
    const result = truncateField("Scène très longue\n".repeat(200));
    assert.ok(result.length <= 1024);
    assert.match(result, /liste abrégée/);
});
