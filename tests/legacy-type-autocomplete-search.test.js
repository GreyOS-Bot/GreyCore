const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createIsolatedDatabase
} = require("./helpers/isolatedDatabase");

test(
    "la recherche des types de relation conserve les trois champs, l'ordre et la casse Unicode",
    context => {
        const isolated = createIsolatedDatabase({
            initializeSchema: true
        });
        context.after(() => isolated.cleanup());

        seedTypes(isolated.database);
        clearModules();

        const manager = require(
            "../src/managers/RelationshipTypeManager"
        );

        assert.deepEqual(
            manager.searchRelationshipTypes("guild", "", 25)
                .map(type => type.label_a_to_b),
            Array.from(
                { length: 25 },
                (_, index) => `Alpha ${String(index).padStart(3, "0")}`
            )
        );
        assert.equal(
            manager.searchRelationshipTypes(
                "guild",
                "SPECIAL-KEY",
                25
            )[0].key,
            "special-key"
        );
        assert.equal(
            manager.searchRelationshipTypes(
                "guild",
                "inverse unique",
                25
            )[0].label_b_to_a,
            "Inverse Unique"
        );
        assert.deepEqual(
            manager.searchRelationshipTypes(
                "guild",
                "élue",
                25
            ).map(type => type.label_a_to_b),
            ["Élue Finale"]
        );
        assert.equal(
            manager.searchRelationshipTypes(
                "guild",
                "Other Guild",
                25
            ).length,
            0
        );
        assert.ok(
            manager.searchRelationshipTypes(
                "guild",
                "alpha",
                100
            ).length <= 25
        );
    }
);

test(
    "la recherche des types d'état conserve le nom, l'emoji, l'ordre et la casse Unicode",
    context => {
        const isolated = createIsolatedDatabase({
            initializeSchema: true
        });
        context.after(() => isolated.cleanup());

        seedTypes(isolated.database);
        clearModules();

        const manager = require(
            "../src/managers/StateManager"
        );

        assert.deepEqual(
            manager.searchStateTypes("guild", "", 25)
                .map(type => type.name),
            Array.from(
                { length: 25 },
                (_, index) => `Alpha ${String(index).padStart(3, "0")}`
            )
        );
        assert.deepEqual(
            manager.searchStateTypes("guild", "ÉPUIS", 25)
                .map(type => [type.name, type.emoji]),
            [["Épuisé·e Final", "😴"]]
        );
        assert.equal(
            manager.searchStateTypes(
                "guild",
                "Other Guild",
                25
            ).length,
            0
        );
        assert.ok(
            manager.searchStateTypes(
                "guild",
                "alpha",
                100
            ).length <= 25
        );
    }
);

test(
    "les deux autocompletes utilisent les recherches bornées et conservent leurs IDs",
    async context => {
        const isolated = createIsolatedDatabase();
        context.after(() => isolated.cleanup());
        clearModules();

        const relationshipTypes = require(
            "../src/managers/RelationshipTypeManager"
        );
        const states = require(
            "../src/managers/StateManager"
        );
        const relationships = require(
            "../src/managers/RelationshipManager"
        );
        const modules = require(
            "../src/v2/managers/GuildModuleV2Manager"
        );
        const access = require(
            "../src/v2/core/services/StaffCommandAccessService"
        );

        const originals = {
            relationshipSearch: relationshipTypes.searchRelationshipTypes,
            relationshipAll: relationshipTypes.getTypesByGuild,
            stateSearch: states.searchStateTypes,
            stateAll: states.getStateTypesByGuild,
            createRelationship: relationships.createRelationship,
            isEnabled: modules.isEnabled,
            requireAccess: access.requireStaffCommandAccess,
            getState: states.getStateTypeById,
            countStates: states.countStatesUsingType
        };
        context.after(() => {
            relationshipTypes.searchRelationshipTypes = originals.relationshipSearch;
            relationshipTypes.getTypesByGuild = originals.relationshipAll;
            states.searchStateTypes = originals.stateSearch;
            states.getStateTypesByGuild = originals.stateAll;
            relationships.createRelationship = originals.createRelationship;
            modules.isEnabled = originals.isEnabled;
            access.requireStaffCommandAccess = originals.requireAccess;
            states.getStateTypeById = originals.getState;
            states.countStatesUsingType = originals.countStates;
            clearModules();
        });

        const searches = [];
        relationshipTypes.searchRelationshipTypes = (...args) => {
            searches.push(["relationship", ...args]);
            return [{
                id: 41,
                key: "friend",
                label_a_to_b: "Ami·e",
                label_b_to_a: "Ami·e"
            }];
        };
        relationshipTypes.getTypesByGuild = () => {
            throw new Error("chargement global interdit");
        };
        states.searchStateTypes = (...args) => {
            searches.push(["state", ...args]);
            return [{ id: 42, name: "Blessé·e", emoji: "🩹" }];
        };
        states.getStateTypesByGuild = () => {
            throw new Error("chargement global interdit");
        };

        const relationshipAutocomplete = require(
            "../src/autocomplete/relationshipTypes"
        );
        const stateAutocomplete = require(
            "../src/autocomplete/stateTypes"
        );
        const relationshipChoices = [];
        const stateChoices = [];

        await relationshipAutocomplete(
            autocompleteInteraction("FRI", relationshipChoices)
        );
        await stateAutocomplete(
            autocompleteInteraction("LESS", stateChoices)
        );

        assert.deepEqual(searches, [
            ["relationship", "guild", "fri", 25],
            ["state", "guild", "less", 25]
        ]);
        assert.deepEqual(relationshipChoices[0], [{
            name: "Ami·e / Ami·e",
            value: "41"
        }]);
        assert.deepEqual(stateChoices[0], [{
            name: "🩹 Blessé·e",
            value: "42"
        }]);

        let relationshipInput;
        relationships.createRelationship = input => {
            relationshipInput = input;
            return {
                label_a_to_b: "Ami·e",
                label_b_to_a: "Ami·e"
            };
        };
        modules.isEnabled = () => true;
        access.requireStaffCommandAccess = async () => true;
        let requestedStateId;
        states.getStateTypeById = id => {
            requestedStateId = id;
            return {
                id,
                guildId: "guild",
                name: "Blessé·e"
            };
        };
        states.countStatesUsingType = () => 0;

        delete require.cache[require.resolve("../src/commands/relation")];
        delete require.cache[require.resolve("../src/commands/deleteStateType")];
        const relation = require("../src/commands/relation");
        const deleteState = require("../src/commands/deleteStateType");

        await relation.execute(commandInteraction({
            personnage_a: "character-a",
            personnage_b: "character-b",
            type: "41"
        }));
        await deleteState.execute(commandInteraction({ type: "42" }));

        assert.equal(relationshipInput.relationshipTypeId, 41);
        assert.equal(requestedStateId, 42);
    }
);

function autocompleteInteraction(focused, responses) {
    return {
        guild: { id: "guild" },
        options: { getFocused: () => focused },
        respond: async choices => responses.push(choices)
    };
}

function commandInteraction(values) {
    return {
        guildId: "guild",
        guild: { id: "guild" },
        user: { id: "user" },
        member: {},
        options: { getString: name => values[name] },
        reply: async () => null
    };
}

function seedTypes(database) {
    const now = "2026-08-28T02:00:00.000Z";
    database.exec(`
        INSERT INTO Guilds (id, name, created_at) VALUES
            ('guild', 'Greyline', '${now}'),
            ('other-guild', 'Other', '${now}');
    `);

    const insertRelationship = database.prepare(`
        INSERT INTO RelationshipTypes (
            guild_id, key, label_a_to_b, label_b_to_a,
            is_symmetric, created_at
        ) VALUES (?, ?, ?, ?, 0, ?)
    `);
    const insertState = database.prepare(`
        INSERT INTO StateTypes (
            guild_id, name, emoji, color, created_by, created_at
        ) VALUES (?, ?, ?, '#2B2D31', 'user', ?)
    `);

    for (let index = 0; index < 130; index += 1) {
        const suffix = String(index).padStart(3, "0");
        insertRelationship.run(
            "guild",
            index === 110 ? "special-key" : `key-${suffix}`,
            `Alpha ${suffix}`,
            index === 111 ? "Inverse Unique" : `Retour ${suffix}`,
            now
        );
        insertState.run(
            "guild",
            `Alpha ${suffix}`,
            index === 0 ? null : "🔹",
            now
        );
    }

    insertRelationship.run(
        "guild", "accent", "Élue Finale", "Élu Final", now
    );
    insertState.run(
        "guild", "Épuisé·e Final", "😴", now
    );
    insertRelationship.run(
        "other-guild", "other", "Other Guild", "Other Guild", now
    );
    insertState.run(
        "other-guild", "Other Guild", "❌", now
    );
}

function clearModules() {
    for (const modulePath of [
        "../src/managers/RelationshipTypeManager",
        "../src/managers/StateManager",
        "../src/autocomplete/relationshipTypes",
        "../src/autocomplete/stateTypes",
        "../src/commands/relation",
        "../src/commands/deleteStateType"
    ]) {
        delete require.cache[require.resolve(modulePath)];
    }
}
