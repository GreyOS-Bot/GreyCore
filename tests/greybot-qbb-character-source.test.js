const test = require("node:test");
const assert = require("node:assert/strict");
const { createIsolatedDatabase } = require("./helpers/isolatedDatabase");

test("QBQ sépare les PJ invocables des PNJ réservés seulement citables", () => {
    const isolated = createIsolatedDatabase({ initializeSchema: true });
    try {
        const db = isolated.database;
        const now = new Date().toISOString();
        db.prepare("INSERT INTO Guilds (id, name, created_at) VALUES (?, ?, ?)").run("guild", "Test", now);
        const ownerId = db.prepare("INSERT INTO UsersV2 (discord_user_id, created_at, updated_at) VALUES (?, ?, ?)")
            .run("discord", now, now).lastInsertRowid;
        const add = (id, type, alias) => {
            db.prepare(`INSERT INTO CharactersV2
                (id, owner_user_id, proxy_name, character_type, is_archived, created_at, updated_at)
                VALUES (?, ?, ?, ?, 0, ?, ?)`
            ).run(id, ownerId, alias, type, now, now);
            db.prepare(`INSERT INTO CharacterContinuitiesV2
                (id, character_id, name, firstname, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)`
            ).run(`continuity-${id}`, id, alias, alias, now, now);
            db.prepare(`INSERT INTO CharacterGuildInstallationsV2
                (character_id, continuity_id, guild_id, status, proxy_enabled, installed_at, updated_at)
                VALUES (?, ?, 'guild', 'approved', 1, ?, ?)`
            ).run(id, `continuity-${id}`, now, now);
        };
        add("pj", "personnage_joue", "Alba");
        add("reserved", "pnj_reserve", "Le Parrain");
        add("npc", "pnj", "Parent");

        const rows = require("../src/integrations/GreybotCharacterSource")
            .getQbbCharactersForGuild("guild");

        assert.deepEqual(rows.map(row => [row.id, row.can_respond, row.can_be_cited]), [
            ["pj", 1, 1],
            ["reserved", 0, 1]
        ]);
    } finally {
        isolated.cleanup();
    }
});
