const test = require("node:test");
const assert = require("node:assert/strict");

function stubModule(relativePath, exports) {
    const path = require.resolve(`../${relativePath}`);
    const previous = require.cache[path];
    require.cache[path] = { id: path, filename: path, loaded: true, exports };
    return () => {
        if (previous) {
            require.cache[path] = previous;
        } else {
            delete require.cache[path];
        }
    };
}

function deniedInteraction() {
    const messages = [];
    return {
        guildId: "guild",
        guild: {
            id: "guild",
            ownerId: "owner",
            name: "Serveur",
            channels: {
                cache: {
                    get: () => null
                },
                fetch: async () => {
                    throw new Error("fetch should not run before permission check");
                }
            }
        },
        channel: {
            id: "channel",
            type: 0,
            parentId: "category"
        },
        channelId: "channel",
        user: { id: "member" },
        member: {
            user: { id: "member" },
            roles: { cache: new Map([["role", {}]]) },
            permissions: { has: () => false }
        },
        options: {
            getSubcommand: () => "",
            getChannel: () => ({ id: "zone", type: 0 }),
            getString: () => "expression"
        },
        messages,
        reply: async payload => {
            messages.push({ type: "private", payload });
        },
        replyError: async (interaction, message) => {
            messages.push({ type: "error", message });
        },
        replyPrivate: async (_interaction, payload) => {
            messages.push({ type: "private", payload });
        }
    };
}

function commandContext() {
    const interaction = deniedInteraction();
    return { interaction, messages: interaction.messages };
}

test("2C.7b conserve statut et diagnostic publics sans canRead/canWrite", async context => {
    const restoreScene = stubModule("src/v2/services/scenes/SceneAssistantService", {
        getStatus: () => ({ kind: "disabled" }),
        getChannelAndParentIds: () => [],
        buildStartPrompt: () => ""
    });
    const restoreManager = stubModule("src/v2/managers/SceneAssistantV2Manager", {
        getConfiguration: () => ({ is_enabled: 1 }),
        getScopes: () => [],
        getActiveSceneByChannel: () => null
    });
    const restoreAccess = stubModule("src/v2/core/services/AdministrativePermissionAccessService", {
        canRead: () => {
            throw new Error("canRead should not run for statut/diagnostic");
        },
        canWrite: () => {
            throw new Error("canWrite should not run for statut/diagnostic");
        }
    });
    context.after(() => {
        restoreScene();
        restoreManager();
        restoreAccess();
    });
    delete require.cache[require.resolve("../src/commands/scene")];
    const sceneCommand = require("../src/commands/scene");

    const statut = commandContext();
    statut.interaction.options.getSubcommand = () => "statut";
    await sceneCommand.execute(statut.interaction);
    assert.equal(statut.messages.length, 1);
    assert.equal(statut.messages[0].type, "private");

    const diagnostic = commandContext();
    diagnostic.interaction.options.getSubcommand = () => "diagnostic";
    await sceneCommand.execute(diagnostic.interaction);
    assert.equal(diagnostic.messages.length, 1);
    assert.equal(diagnostic.messages[0].type, "private");
});

test("2C.7b bloque les lectures scènes sans canRead", async context => {
    const calls = { ensure: 0, scope: 0, getExpr: 0 };
    const restoreAccess = stubModule("src/v2/core/services/AdministrativePermissionAccessService", {
        canRead: () => false,
        canWrite: () => true
    });
    const restoreGuild = stubModule("src/v2/repositories/GuildRepository", {
        ensure: () => {
            calls.ensure += 1;
        }
    });
    const restoreManager = stubModule("src/v2/managers/SceneAssistantV2Manager", {
        getScopes: () => {
            calls.scope += 1;
            return [];
        },
        getTriggerExpressions: () => {
            calls.getExpr += 1;
            return [];
        }
    });
    context.after(() => {
        restoreAccess();
        restoreGuild();
        restoreManager();
    });
    delete require.cache[require.resolve("../src/commands/scene")];
    const sceneCommand = require("../src/commands/scene");

    for (const subcommand of ["zones", "expressions"]) {
        const denied = commandContext();
        denied.interaction.options.getSubcommand = () => subcommand;
        await sceneCommand.execute(denied.interaction);
        assert.equal(denied.messages.length, 1);
        assert.equal(denied.messages[0].type, "private");
    }

    assert.equal(calls.ensure, 0);
    assert.equal(calls.scope, 0);
    assert.equal(calls.getExpr, 0);
});

test("2C.7b autorise lectures scènes avec canRead", async context => {
    const calls = { ensure: 0, scope: 0, getExpr: 0 };
    const restoreAccess = stubModule("src/v2/core/services/AdministrativePermissionAccessService", {
        canRead: () => true,
        canWrite: () => true
    });
    const restoreGuild = stubModule("src/v2/repositories/GuildRepository", {
        ensure: () => {
            calls.ensure += 1;
        }
    });
    const restoreManager = stubModule("src/v2/managers/SceneAssistantV2Manager", {
        getScopes: () => {
            calls.scope += 1;
            return [];
        },
        getTriggerExpressions: () => {
            calls.getExpr += 1;
            return [];
        }
    });
    context.after(() => {
        restoreAccess();
        restoreGuild();
        restoreManager();
    });
    delete require.cache[require.resolve("../src/commands/scene")];
    const sceneCommand = require("../src/commands/scene");

    const zones = commandContext();
    zones.interaction.options.getSubcommand = () => "zones";
    await sceneCommand.execute(zones.interaction);
    assert.equal(zones.messages[0].type, "private");

    const expressions = commandContext();
    expressions.interaction.options.getSubcommand = () => "expressions";
    await sceneCommand.execute(expressions.interaction);
    assert.equal(expressions.messages[0].type, "private");

    assert.equal(calls.ensure, 0);
    assert.equal(calls.scope, 1);
    assert.equal(calls.getExpr, 1);
});

test("2C.7b bloque toutes les mutations sans canWrite", async context => {
    const calls = {
        ensure: 0,
        addScope: 0,
        removeScope: 0,
        addExpr: 0,
        removeExpr: 0,
        newCycle: 0,
        fetch: 0
    };

    const restoreAccess = stubModule("src/v2/core/services/AdministrativePermissionAccessService", {
        canRead: () => true,
        canWrite: () => false
    });
    const restoreGuild = stubModule("src/v2/repositories/GuildRepository", {
        ensure: () => {
            calls.ensure += 1;
        }
    });
    const restoreManager = stubModule("src/v2/managers/SceneAssistantV2Manager", {
        addScope: () => {
            calls.addScope += 1;
            return [];
        },
        removeScope: () => {
            calls.removeScope += 1;
            return true;
        },
        addTriggerExpression: () => {
            calls.addExpr += 1;
        },
        removeTriggerExpression: () => {
            calls.removeExpr += 1;
            return true;
        }
    });
    const restoreService = stubModule("src/v2/services/scenes/SceneAssistantService", {
        startNewCycle: () => {
            calls.newCycle += 1;
        }
    });
    context.after(() => {
        restoreAccess();
        restoreGuild();
        restoreManager();
        restoreService();
    });
    delete require.cache[require.resolve("../src/commands/scene")];
    const sceneCommand = require("../src/commands/scene");

    const interaction = deniedInteraction();
    for (const subcommand of [
        "ajouter-zone",
        "retirer-zone",
        "ajouter-categorie-actuelle",
        "ajouter-expression",
        "retirer-expression",
        "nouveau-cycle"
    ]) {
        const denied = {
            ...interaction,
            reply: async payload => {
                denied.messages.push({ type: "private", payload });
            },
            replyError: async (interaction, message) => {
                denied.messages.push({ type: "error", message });
            },
            replyPrivate: async (_interaction, payload) => {
                denied.messages.push({ type: "private", payload });
            },
            messages: []
        };
        denied.options.getSubcommand = () => subcommand;
        denied.options.getChannel = () => ({ id: "zone", type: 0 });
        denied.options.getString = () => "expr";
        denied.guild.channels.fetch = async () => {
            calls.fetch += 1;
            return { id: "fetched", type: 4, name: "cat" };
        };

        await sceneCommand.execute(denied);
        assert.equal(denied.messages.length, 1);
        assert.equal(denied.messages[0].type, "private");
    }

    assert.equal(calls.ensure, 0);
    assert.equal(calls.addScope, 0);
    assert.equal(calls.removeScope, 0);
    assert.equal(calls.addExpr, 0);
    assert.equal(calls.removeExpr, 0);
    assert.equal(calls.newCycle, 0);
    assert.equal(calls.fetch, 0);
});

test("2C.7b autorise mutations scènes avec canWrite et garde l’ordre d’exécution", async context => {
    const calls = {
        ensure: 0,
        addScope: 0,
        removeScope: 0,
        addExpr: 0,
        removeExpr: 0,
        newCycle: 0
    };

    const restoreAccess = stubModule("src/v2/core/services/AdministrativePermissionAccessService", {
        canRead: () => true,
        canWrite: () => true
    });
    const restoreGuild = stubModule("src/v2/repositories/GuildRepository", {
        ensure: () => {
            calls.ensure += 1;
        }
    });
    const restoreManager = stubModule("src/v2/managers/SceneAssistantV2Manager", {
        addScope: () => {
            calls.addScope += 1;
            return [];
        },
        removeScope: () => {
            calls.removeScope += 1;
            return true;
        },
        addTriggerExpression: () => {
            calls.addExpr += 1;
        },
        removeTriggerExpression: () => {
            calls.removeExpr += 1;
            return true;
        }
    });
    const restoreService = stubModule("src/v2/services/scenes/SceneAssistantService", {
        startNewCycle: () => {
            calls.newCycle += 1;
        }
    });
    context.after(() => {
        restoreAccess();
        restoreGuild();
        restoreManager();
        restoreService();
    });
    delete require.cache[require.resolve("../src/commands/scene")];
    const sceneCommand = require("../src/commands/scene");

    const baseInteraction = deniedInteraction();
    baseInteraction.guild.channels = {
        cache: new Map([[
            "category",
            { id: "category", type: 4, name: "cat" }
        ]]),
        fetch: async () => ({ id: "category", type: 4, name: "cat" })
    };

    const writeCases = [
        { name: "ajouter-zone", expects: "private" },
        { name: "retirer-zone", expects: "private" },
        { name: "ajouter-categorie-actuelle", expects: "private" },
        { name: "ajouter-expression", expects: "private" },
        { name: "retirer-expression", expects: "private" },
        { name: "nouveau-cycle", expects: "private" }
    ];

    for (const item of writeCases) {
        const interaction = {
            ...baseInteraction,
            messages: [],
            reply: async payload => {
                interaction.messages.push({ type: "private", payload });
            },
            replyError: async message => {
                interaction.messages.push({ type: "error", message });
            },
            replyPrivate: async (_interaction, payload) => {
                interaction.messages.push({ type: "private", payload });
            },
            options: {
                ...baseInteraction.options,
                getSubcommand: () => item.name,
                getChannel: () => ({ id: "zone", type: 0 }),
                getString: () => "expr"
            }
        };
        await sceneCommand.execute(interaction);
        assert.equal(interaction.messages.length, 1);
        assert.equal(interaction.messages[0].type, item.expects);
    }

    assert.equal(calls.ensure, 6);
    assert.equal(calls.addScope, 2);
    assert.equal(calls.removeScope, 1);
    assert.equal(calls.addExpr, 1);
    assert.equal(calls.removeExpr, 1);
    assert.equal(calls.newCycle, 1);
});
