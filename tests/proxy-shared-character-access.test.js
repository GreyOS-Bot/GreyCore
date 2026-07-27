const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require(
    "./helpers/isolatedDatabase"
);

const {
    stubModule
} = require("./helpers/moduleStub");

test(
    "les Random sont jouables par tous et les personnages réservés par le staff seulement",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createTables(isolated.database);
            seedCharacters(isolated.database);

            stubModule(
                "src/managers/CharacterManager.js",
                {
                    getCharacterForProxy: () => null
                }
            );

            const resolverPath =
                require.resolve(
                    "../src/services/proxy/ProxyCharacterResolver"
                );

            delete require.cache[resolverPath];

            const resolver =
                require(
                    "../src/services/proxy/ProxyCharacterResolver"
                );

            const random =
                resolver.resolveProxyCharacter({
                    discordUserId: "guest",
                    guildId: "guild",
                    proxyName: "Gars 1"
                });

            assert.equal(random.character.id, "random");

            const reservedDenied =
                resolver.resolveProxyCharacter({
                    discordUserId: "guest",
                    guildId: "guild",
                    proxyName: "Chef"
                });

            assert.equal(
                reservedDenied.character,
                null
            );

            assert.equal(
                reservedDenied.v2Installation.access_denied,
                true
            );

            const reservedStaff =
                resolver.resolveProxyCharacter({
                    discordUserId: "staff",
                    guildId: "guild",
                    proxyName: "Chef",
                    isStaff: true
                });

            assert.equal(
                reservedStaff.character.id,
                "reserved"
            );

            const personalDenied =
                resolver.resolveProxyCharacter({
                    discordUserId: "guest",
                    guildId: "guild",
                    proxyName: "Alba"
                });

            assert.equal(
                personalDenied.character,
                null
            );

            const personalOwner =
                resolver.resolveProxyCharacter({
                    discordUserId: "owner",
                    guildId: "guild",
                    proxyName: "Alba"
                });

            assert.equal(
                personalOwner.character.id,
                "personal"
            );
        } finally {
            isolated.cleanup();
        }
    }
);

function createTables(db) {
    db.exec(`
        CREATE TABLE UsersV2 (
            id INTEGER PRIMARY KEY,
            discord_user_id TEXT NOT NULL UNIQUE
        );

        CREATE TABLE CharactersV2 (
            id TEXT PRIMARY KEY,
            owner_user_id INTEGER NOT NULL,
            proxy_name TEXT NOT NULL,
            avatar_url TEXT,
            character_type TEXT NOT NULL,
            is_archived INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE CharacterGuildInstallationsV2 (
            id INTEGER PRIMARY KEY,
            character_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            status TEXT NOT NULL,
            proxy_enabled INTEGER NOT NULL,
            local_avatar_url TEXT,
            installed_at TEXT NOT NULL
        );
    `);
}

function seedCharacters(db) {
    for (
        const [id, discordUserId, proxyName, type] of [
            ["random", "owner", "Gars 1", "random"],
            ["reserved", "owner", "Chef", "pnj_reserve"],
            ["personal", "owner", "Alba", "personnage_joue"]
        ]
    ) {
        const userId =
            discordUserId === "owner"
                ? 1
                : 2;

        db.prepare(`
            INSERT OR IGNORE INTO UsersV2 VALUES (?, ?)
        `).run(
            userId,
            discordUserId
        );

        db.prepare(`
            INSERT INTO CharactersV2 VALUES (?, ?, ?, NULL, ?, 0)
        `).run(
            id,
            userId,
            proxyName,
            type
        );

        db.prepare(`
            INSERT INTO CharacterGuildInstallationsV2 VALUES (NULL, ?, 'guild', 'approved', 1, NULL, 'now')
        `).run(id);
    }

    db.prepare(`
        INSERT INTO UsersV2 VALUES (2, 'staff')
    `).run();
}
