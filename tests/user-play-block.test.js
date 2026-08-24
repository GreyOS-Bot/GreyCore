const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function clearModules() {
    Object.keys(require.cache).filter(key => key.includes(`${path.sep}src${path.sep}database${path.sep}`)
        || key.includes(`${path.sep}UserPlayBlock`)).forEach(key => delete require.cache[key]);
}

test("un blocage est isolé par serveur et entièrement réversible", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "greycore-play-block-"));
    process.env.GREYCORE_DATABASE_PATH = path.join(directory, "data", "test.sqlite");
    clearModules();
    require("../src/database/schemaV2")();
    const service = require("../src/v2/services/moderation/UserPlayBlockService");

    service.block({ guildId: "guild-a", discordUserId: "user", reason: "Rééquilibrage demandé", blockedBy: "staff" });
    assert.equal(service.isBlocked("guild-a", "user"), true);
    assert.equal(service.isBlocked("guild-b", "user"), false);
    assert.equal(service.list("guild-a")[0].reason, "Rééquilibrage demandé");

    let response;
    const blocked = await service.blockInteraction({
        guildId: "guild-a",
        user: { id: "user" },
        commandName: "personnage",
        isAutocomplete: () => false,
        reply: async payload => { response = payload; }
    });
    assert.equal(blocked, true);
    assert.match(response.content, /Rééquilibrage demandé/);

    assert.equal(service.unblock("guild-a", "user"), true);
    assert.equal(service.isBlocked("guild-a", "user"), false);
    require("../src/database/database").close();
    delete process.env.GREYCORE_DATABASE_PATH;
    fs.rmSync(directory, { recursive: true, force: true });
    clearModules();
});

test("un proxy est refusé avant publication pour un utilisateur bloqué", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "greycore-proxy-block-"));
    process.env.GREYCORE_DATABASE_PATH = path.join(directory, "test.sqlite");
    clearModules();
    require("../src/database/schemaV2")();
    const service = require("../src/v2/services/moderation/UserPlayBlockService");
    service.block({ guildId: "guild", discordUserId: "user", reason: "Sur la sellette", blockedBy: "staff" });
    const handler = require("../src/events/handlers/messageCreate/ProxyMessageHandler");
    let response;
    const message = {
        guild: { id: "guild" },
        author: { id: "user" },
        content: "Reya: Bonjour",
        reply: async value => { response = value; }
    };

    assert.equal(await handler(message), true);
    assert.equal(message.greycorePlayBlocked, true);
    assert.match(response, /Sur la sellette/);
    require("../src/database/database").close();
    delete process.env.GREYCORE_DATABASE_PATH;
    fs.rmSync(directory, { recursive: true, force: true });
    clearModules();
});

test("la commande blocage expose bloquer, débloquer et liste", () => {
    const command = require("../src/commands/blocage").data.toJSON();
    assert.deepEqual(command.options.map(option => option.name), ["bloquer", "debloquer", "liste"]);
    const catalog = require("../src/deploy/CommandDeploymentCatalog");
    assert.equal(catalog.PUBLIC_SLASH_COMMANDS.has("blocage"), true);
});