const test = require("node:test");
const assert = require("node:assert/strict");

function stubModule(relativePath, exports) {
    const path = require.resolve(`../${relativePath}`);
    require.cache[path] = { id: path, filename: path, loaded: true, exports };
    return path;
}

function clear(paths) {
    for (const path of paths) delete require.cache[path];
}

function buttonIds(payload) {
    return payload.components
        .flatMap(row => row.toJSON().components)
        .map(component => ({
            id: component.custom_id,
            disabled: component.disabled === true
        }));
}

test("2C.4b route Biens avec assets/read strict et neutralise Banque", async context => {
    const decisions = [];
    let assetsAllowed = false;
    const paths = [
        stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
            decide: options => {
                decisions.push(options);
                return { allowed: assetsAllowed };
            }
        }),
        stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
            canAccess: () => true,
            canManagePermissions: () => false
        }),
        stubModule("src/v2/pages/staff/StaffAssetsPage.js", {
            execute: async interaction => { interaction.opened = "assets"; }
        })
    ];
    const sectionPath = require.resolve("../src/v2/pages/staff/StaffSectionPage");
    delete require.cache[sectionPath];
    paths.push(sectionPath);
    context.after(() => clear(paths));
    const page = require(sectionPath);

    const denied = {
        guildId: "guild", user: { id: "member" },
        update: async payload => { denied.payload = payload; }
    };
    await page.execute(denied, "assets");
    assert.match(denied.payload.content, /pas accès/);
    assert.equal(denied.opened, undefined);

    assetsAllowed = true;
    const allowed = { guildId: "guild", user: { id: "member" } };
    await page.execute(allowed, "assets");
    assert.equal(allowed.opened, "assets");
    assert.deepEqual(decisions.map(({ permission, write, legacyCanAccessParity }) => ({
        permission, write, legacyCanAccessParity
    })), [
        { permission: "assets", write: false, legacyCanAccessParity: undefined },
        { permission: "assets", write: false, legacyCanAccessParity: undefined }
    ]);

    clear([require.resolve("../src/v2/pages/staff/StaffBankPage")]);
    const bank = require("../src/v2/pages/staff/StaffBankPage").build({ guildId: "guild" });
    assert.match(bank.embeds[0].toJSON().description, /Biens.*propre section/s);
    assert.equal(buttonIds(bank).some(button => button.id.includes("assets")), false);
});

test("2C.4b affiche les statistiques en lecture et sépare les deux écritures", context => {
    let grants = { assetsRead: true, assetsWrite: false, modulesWrite: false };
    const paths = [
        stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
            decideMany: ({ requests, legacyCanAccessParity }) => {
                assert.equal(legacyCanAccessParity, undefined);
                assert.deepEqual(requests, [
                    { permission: "assets", write: false },
                    { permission: "assets", write: true },
                    { permission: "modules", write: true }
                ]);
                return { decisions: [
                    { allowed: grants.assetsRead },
                    { allowed: grants.assetsWrite },
                    { allowed: grants.modulesWrite }
                ] };
            }
        }),
        stubModule("src/v2/repositories/StaffDomainStatsRepository.js", {
            getBankStats: () => ({ assets: 7, transfers: 3, types: 0 })
        }),
        stubModule("src/v2/managers/GuildModuleV2Manager.js", {
            isEnabled: () => true
        }),
        stubModule("src/v2/managers/AssetTypeV2Manager.js", {
            getForGuild: () => []
        })
    ];
    const pagePath = require.resolve("../src/v2/pages/staff/StaffAssetsPage");
    delete require.cache[pagePath];
    paths.push(pagePath);
    context.after(() => clear(paths));
    const page = require(pagePath);

    let payload = page.build({ guildId: "guild", user: { id: "member" } });
    assert.match(payload.embeds[0].toJSON().title, /Biens/);
    assert.match(payload.embeds[0].toJSON().fields.map(field => field.name).join(" "), /Transferts/);
    assert.deepEqual(buttonIds(payload).filter(button => button.id.includes("assets")), [
        { id: "v2_staff_domain_toggle:assets", disabled: true },
        { id: "v2_staff_assets_install_defaults", disabled: true }
    ]);

    grants = { assetsRead: true, assetsWrite: true, modulesWrite: false };
    payload = page.build({ guildId: "guild", user: { id: "member" } });
    assert.deepEqual(buttonIds(payload).filter(button => button.id.includes("assets")), [
        { id: "v2_staff_domain_toggle:assets", disabled: true },
        { id: "v2_staff_assets_install_defaults", disabled: false }
    ]);

    grants = { assetsRead: true, assetsWrite: false, modulesWrite: true };
    payload = page.build({ guildId: "guild", user: { id: "member" } });
    assert.deepEqual(buttonIds(payload).filter(button => button.id.includes("assets")), [
        { id: "v2_staff_domain_toggle:assets", disabled: false },
        { id: "v2_staff_assets_install_defaults", disabled: true }
    ]);
});

test("2C.4b revalide les mutations strictes et périme l'ancien bouton bank", async context => {
    const calls = { ensure: 0, toggles: 0, inactive: 0, denied: 0, decisions: [] };
    let grants = { assets: false, modules: false };
    const paths = [
        stubModule("src/v2/core/services/StaffPermissionDecisionService.js", {
            decide: options => {
                calls.decisions.push(options);
                return { allowed: grants[options.permission] === true };
            }
        }),
        stubModule("src/v2/core/policies/StaffPermissionPolicy.js", {
            canAccess: () => true
        }),
        stubModule("src/v2/core/services/InteractionResponseService.js", {
            replyError: async () => { calls.denied += 1; },
            replyInactiveInterface: async () => { calls.inactive += 1; }
        }),
        stubModule("src/v2/managers/GuildModuleV2Manager.js", {
            isEnabled: () => false,
            setEnabled: () => { calls.toggles += 1; }
        }),
        stubModule("src/v2/managers/AssetTypeV2Manager.js", {
            ensureDefaults: () => { calls.ensure += 1; }
        }),
        stubModule("src/v2/pages/staff/StaffAssetsPage.js", {
            build: () => ({ content: "assets" })
        })
    ];
    const routerPath = require.resolve("../src/v2/router/buttons/StaffRouter");
    delete require.cache[routerPath];
    paths.push(routerPath);
    context.after(() => clear(paths));
    const router = require(routerPath);
    const run = async customId => router({
        customId, guildId: "guild", user: { id: "member" },
        isButton: () => true,
        reply: async () => {},
        update: async () => {}
    });

    grants = { assets: true, modules: false };
    await run("v2_staff_assets_install_defaults");
    await run("v2_staff_domain_toggle:assets");
    assert.equal(calls.ensure, 1);
    assert.equal(calls.toggles, 0);

    grants = { assets: false, modules: true };
    await run("v2_staff_assets_install_defaults");
    await run("v2_staff_domain_toggle:assets");
    assert.equal(calls.ensure, 1);
    assert.equal(calls.toggles, 1);

    grants = { assets: true, modules: true };
    await run("v2_staff_bank_install_defaults");
    assert.equal(calls.ensure, 1);
    assert.equal(calls.inactive, 1);
    assert.equal(calls.decisions.some(call => call.legacyCanAccessParity === true), false);
    assert.deepEqual(calls.decisions.map(call => [call.permission, call.write]), [
        ["assets", true], ["modules", true],
        ["assets", true], ["modules", true]
    ]);
});
