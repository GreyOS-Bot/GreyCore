const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");

test(
    "le staff peut convertir un Random en PJ avec une portée privée",
    () => {
        const directory = fs.mkdtempSync(
            path.join(os.tmpdir(), "greycore-type-")
        );
        process.env.GREYCORE_DATABASE_PATH =
            path.join(directory, "test.sqlite");

        clearDatabaseModules();
        const db = require(
            "../src/database/database"
        );
        require(
            "../src/database/schema"
        ).initializeDatabase();

        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO Guilds
                (id, name, created_at)
            VALUES ('guild', 'Greyline', ?)
        `).run(now);
        const ownerUserId = db.prepare(`
            INSERT INTO UsersV2
                (discord_user_id, created_at, updated_at)
            VALUES ('owner', ?, ?)
        `).run(now, now).lastInsertRowid;
        db.prepare(`
            INSERT INTO CharactersV2
                (id, owner_user_id, proxy_name, character_type, is_archived, created_at, updated_at)
            VALUES ('character', ?, 'Reya', 'random', 0, ?, ?)
        `).run(ownerUserId, now, now);
        db.prepare(`
            INSERT INTO CharacterContinuitiesV2
                (id, character_id, name, firstname, created_at, updated_at)
            VALUES ('continuity', 'character', 'Principale', 'Reya', ?, ?)
        `).run(now, now);
        db.prepare(`
            INSERT INTO CharacterGuildInstallationsV2
                (id, character_id, continuity_id, guild_id, status, visibility, proxy_enabled, installed_at, updated_at)
            VALUES (1, 'character', 'continuity', 'guild', 'approved', 'shared', 1, ?, ?)
        `).run(now, now);

        const service = require(
            "../src/v2/services/character/CharacterTypeCorrectionService"
        );
        const result = service.correct({
            guildId: "guild",
            discordUserId: "owner",
            characterId: "character",
            changes: {
                characterType: "personnage_joue",
                proxyName: "Reya:",
                alias: "Story",
                firstname: "Astoria",
                lastname: "Grey",
                age: 24,
                occupation: "Journaliste"
            }
        });

        assert.equal(
            result.character_type,
            "personnage_joue"
        );
        assert.equal(result.visibility, "private");
        assert.deepEqual(
            result.changedFields,
            [
                "type",
                "proxy",
                "alias affiché",
                "vrai prénom",
                "nom",
                "âge",
                "métier"
            ]
        );
        assert.equal(
            db.prepare(`
                SELECT character_type
                FROM CharactersV2
                WHERE id = 'character'
            `).get().character_type,
            "personnage_joue"
        );
        assert.equal(
            db.prepare(`
                SELECT visibility
                FROM CharacterGuildInstallationsV2
                WHERE id = 1
            `).get().visibility,
            "private"
        );
        assert.deepEqual(
            db.prepare(`
                SELECT alias, firstname, lastname, age, occupation
                FROM CharacterProfilesV2
                WHERE continuity_id = 'continuity'
            `).get(),
            {
                alias: "Story",
                firstname: "Astoria",
                lastname: "Grey",
                age: 24,
                occupation: "Journaliste"
            }
        );
        assert.equal(
            db.prepare(`
                SELECT proxy_name
                FROM CharactersV2
                WHERE id = 'character'
            `).get().proxy_name,
            "Reya:"
        );

        db.close();
        delete process.env.GREYCORE_DATABASE_PATH;
        fs.rmSync(directory, {
            recursive: true,
            force: true
        });
    }
);

function clearDatabaseModules() {
    [
        "../src/database/database",
        "../src/database/schema",
        "../src/v2/repositories/CharacterTypeCorrectionRepository",
        "../src/v2/services/character/CharacterTypeCorrectionService"
    ].forEach(modulePath => {
        delete require.cache[
            require.resolve(modulePath)
        ];
    });
}
