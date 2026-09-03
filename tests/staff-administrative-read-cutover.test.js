const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function stubModule(relativePath, exports) {
    const resolved = require.resolve(`../${relativePath}`);
    const previous = require.cache[resolved];
    require.cache[resolved] = {
        id: resolved,
        filename: resolved,
        loaded: true,
        exports
    };
    return () => {
        if (previous) require.cache[resolved] = previous;
        else delete require.cache[resolved];
    };
}

test("2C.6d1 protège strictement les cinq pages administratives avant lecture", async context => {
    const calls = [];
    const reads = [];
    const restoreAccess = stubModule(
        "src/v2/core/services/AdministrativePermissionAccessService.js",
        {
            canRead: (interaction, permission) => {
                calls.push([interaction.user.id, permission]);
                return interaction.user.id !== "denied";
            }
        }
    );
    const restorePolicy = stubModule(
        "src/v2/core/policies/StaffPermissionPolicy.js",
        {
            canAccess: () => { throw new Error("legacy canAccess interdit"); },
            canManagePermissions: () => false
        }
    );
    const pageFiles = {
        settings: "StaffSettingsPage",
        logs: "StaffLogsPage",
        automations: "StaffAutomationsPage",
        scenes: "StaffScenesPage",
        modules: "StaffModulesPage"
    };
    const restores = Object.entries(pageFiles).map(([domain, file]) =>
        stubModule(`src/v2/pages/staff/${file}.js`, {
            execute: async interaction => {
                reads.push([interaction.user.id, domain]);
            }
        })
    );
    const sectionPath = require.resolve("../src/v2/pages/staff/StaffSectionPage");
    delete require.cache[sectionPath];
    context.after(() => {
        delete require.cache[sectionPath];
        restoreAccess();
        restorePolicy();
        for (const restore of restores) restore();
    });

    const section = require(sectionPath);
    for (const domain of Object.keys(pageFiles)) {
        await section.execute({ user: { id: "allowed" }, update: async () => {} }, domain);
        await section.execute({ user: { id: "denied" }, update: async () => {} }, domain);
    }

    assert.deepEqual(calls, Object.keys(pageFiles).flatMap(domain => [
        ["allowed", domain],
        ["denied", domain]
    ]));
    assert.deepEqual(reads, Object.keys(pageFiles).map(domain => ["allowed", domain]));
});

test("2C.6d1 conserve les READ stricts pendant les cutovers WRITE ciblés", () => {
    const buttonSource = fs.readFileSync(path.join(
        __dirname, "../src/v2/router/buttons/StaffRouter.js"
    ), "utf8");
    const selectSource = fs.readFileSync(path.join(
        __dirname, "../src/v2/router/selects/StaffSelectRouter.js"
    ), "utf8");
    const sectionSource = fs.readFileSync(path.join(
        __dirname, "../src/v2/pages/staff/StaffSectionPage.js"
    ), "utf8");

    for (const source of [buttonSource, selectSource, sectionSource]) {
        assert.doesNotMatch(source, /allowValidationBridge\s*:\s*true/);
    }
    assert.match(buttonSource, /readOnlyActions[\s\S]*administrativeAccess\.canRead/);
    assert.match(buttonSource, /public_places_page:[\s\S]*AdministrativePermissionAccessService/);
    assert.match(selectSource, /public_place_pick:[\s\S]*AdministrativePermissionAccessService/);
    assert.match(buttonSource, /public_places_refresh:[\s\S]*AdministrativePermissionAccessService/);
    assert.match(selectSource, /public_place_category:[\s\S]*administrativeAccess\.canWrite/);
    assert.match(selectSource, /v2_staff_modules_toggle[\s\S]*policy\.canAccess/);
});

test("2C.6d1 émet uniquement les IDs de retour staff canoniques", () => {
    const sources = [
        "../src/v2/pages/staff/StaffSettingsPage.js",
        "../src/v2/views/staff/StaffPublicPlacesView.js"
    ].map(file => fs.readFileSync(path.join(__dirname, file), "utf8")).join("\n");
    assert.doesNotMatch(sources, /page:staff:(settings|scenes):root/);
    assert.match(sources, /page:staff:section:settings/);
    assert.match(sources, /page:staff:section:scenes/);
});
