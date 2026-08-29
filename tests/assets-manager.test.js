const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require("./helpers/isolatedDatabase");

test(
    "les biens conservent leurs catégories, leurs détails et leur transfert",
    () => {
        const isolated =
            createIsolatedDatabase();

        try {
            createAssetTables(isolated.database);

            const {
                typeManager,
                assetManager,
                assetRepository
            } = loadManagers();

            const types = typeManager.ensureDefaults("guild-a");

            assert.equal(types.length, 5);

            const vehicleType = types.find(
                type => type.type_key === "vehicle"
            );

            const asset = assetManager.create({
                guildId: "guild-a",
                continuityId: "continuity-a",
                assetTypeId: vehicleType.id,
                name: "Nissan GT-R",
                description: "Noire, garée devant le garage.",
                details: "Plaque : GREY-01",
                imageUrl: "https://example.com/gtr.png",
                createdBy: "discord-a"
            });

            assert.equal(asset.type_label, "Véhicule");
            assert.equal(asset.owner_name, "Alba");

            const updated = assetManager.update(asset.id, {
                name: "Nissan GT-R R35",
                description: "Noire, préparée pour la course.",
                details: "Plaque : GREY-01 · 600 ch",
                imageUrl: "https://example.com/gtr-r35.png"
            });

            assert.equal(updated.name, "Nissan GT-R R35");
            assert.equal(updated.details, "Plaque : GREY-01 · 600 ch");

            const transferred = assetManager.transfer(asset.id, {
                toContinuityId: "continuity-b",
                transferredBy: "discord-a"
            });

            assert.equal(transferred.continuity_id, "continuity-b");
            assert.equal(transferred.owner_name, "Vega");
            assert.equal(
                assetManager.getForContinuity(
                    "guild-a",
                    "continuity-a"
                ).length,
                0
            );
            assert.equal(
                assetManager.getForContinuity(
                    "guild-a",
                    "continuity-b"
                ).length,
                1
            );

            assert.deepEqual(
                assetManager.getTransfers(asset.id).map(
                    transfer => [
                        transfer.from_continuity_id,
                        transfer.to_continuity_id,
                        transfer.transferred_by,
                        transfer.from_character_name,
                        transfer.to_character_name
                    ]
                ),
                [
                    [
                        "continuity-a",
                        "continuity-b",
                        "discord-a",
                        "Alba",
                        "Vega"
                    ]
                ]
            );

            const staleAsset = assetRepository.getById(asset.id);

            const transferredAgain = assetManager.transfer(asset.id, {
                toContinuityId: "continuity-a",
                expectedContinuityId: "continuity-b",
                transferredBy: "discord-b"
            });

            assert.equal(
                transferredAgain.continuity_id,
                "continuity-a"
            );

            assert.throws(
                () => assetRepository.transfer(staleAsset, {
                    toContinuityId: "continuity-a",
                    expectedContinuityId: "continuity-b",
                    transferredBy: "discord-b",
                    note: null,
                    createdAt: "2026-08-27T11:30:00.000Z"
                }),
                /modifié ou transféré entre-temps/
            );

            assert.throws(
                () => assetRepository.transfer(staleAsset, {
                    toContinuityId: "continuity-c",
                    expectedContinuityId: "continuity-b",
                    transferredBy: "discord-b",
                    note: null,
                    createdAt: "2026-08-27T12:00:00.000Z"
                }),
                /modifié ou transféré entre-temps/
            );

            assert.equal(
                assetManager.getById(asset.id).continuity_id,
                "continuity-a"
            );

            assert.deepEqual(
                assetManager.getTransfers(asset.id).map(
                    transfer => [
                        transfer.from_continuity_id,
                        transfer.to_continuity_id
                    ]
                ),
                [
                    ["continuity-b", "continuity-a"],
                    ["continuity-a", "continuity-b"]
                ]
            );

            assert.throws(
                () => assetManager.transfer(asset.id, {
                    toContinuityId: "continuity-c",
                    expectedContinuityId: "continuity-b",
                    transferredBy: "discord-b"
                }),
                /modifié ou transféré entre-temps/
            );

            assert.equal(
                assetManager.getTransfers(asset.id).length,
                2
            );

            const customType = typeManager.create({
                guildId: "guild-a",
                label: "Bateau",
                emoji: "⛵"
            });

            assert.equal(customType.type_key, "bateau");

            assert.throws(
                () => typeManager.create({
                    guildId: "guild-a",
                    label: "Bateau",
                    emoji: "⛵"
                }),
                /porte déjà ce nom/
            );
        } finally {
            isolated.cleanup();
        }
    }
);

function loadManagers() {
    const modules = [
        "../src/v2/repositories/AssetTypeRepository",
        "../src/v2/repositories/AssetRepository",
        "../src/v2/managers/AssetTypeV2Manager",
        "../src/v2/managers/AssetV2Manager"
    ];

    for (const modulePath of modules) {
        delete require.cache[
            require.resolve(modulePath)
        ];
    }

    return {
        typeManager: require(
            "../src/v2/managers/AssetTypeV2Manager"
        ),
        assetManager: require(
            "../src/v2/managers/AssetV2Manager"
        ),
        assetRepository: require(
            "../src/v2/repositories/AssetRepository"
        )
    };
}

function createAssetTables(database) {
    database.exec(`
        CREATE TABLE Guilds (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE UsersV2 (
            id INTEGER PRIMARY KEY,
            discord_user_id TEXT NOT NULL
        );

        CREATE TABLE CharactersV2 (
            id TEXT PRIMARY KEY,
            owner_user_id INTEGER NOT NULL,
            proxy_name TEXT NOT NULL,
            is_archived INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE CharacterContinuitiesV2 (
            id TEXT PRIMARY KEY,
            character_id TEXT NOT NULL,
            name TEXT NOT NULL,
            is_archived INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE CharacterGuildInstallationsV2 (
            id INTEGER PRIMARY KEY,
            character_id TEXT NOT NULL,
            continuity_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            status TEXT NOT NULL,
            proxy_enabled INTEGER NOT NULL
        );

        CREATE TABLE AssetTypesV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            type_key TEXT NOT NULL,
            label TEXT NOT NULL,
            emoji TEXT,
            is_system INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(guild_id, type_key)
        );

        CREATE TABLE ContinuityAssetsV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            continuity_id TEXT NOT NULL,
            asset_type_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            details TEXT,
            image_url TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE ContinuityAssetTransfersV2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER NOT NULL,
            guild_id TEXT NOT NULL,
            from_continuity_id TEXT NOT NULL,
            to_continuity_id TEXT NOT NULL,
            transferred_by TEXT NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL
        );

        INSERT INTO Guilds (id, name, created_at)
        VALUES ('guild-a', 'GreyOS', '2026-01-01');

        INSERT INTO UsersV2 (id, discord_user_id)
        VALUES
            (1, 'discord-a'),
            (2, 'discord-b'),
            (3, 'discord-c');

        INSERT INTO CharactersV2 (
            id,
            owner_user_id,
            proxy_name,
            is_archived
        )
        VALUES
            ('character-a', 1, 'Alba', 0),
            ('character-b', 2, 'Vega', 0),
            ('character-c', 3, 'Nora', 0);

        INSERT INTO CharacterContinuitiesV2 (
            id,
            character_id,
            name,
            is_archived
        )
        VALUES
            ('continuity-a', 'character-a', 'GreyOS', 0),
            ('continuity-b', 'character-b', 'GreyOS', 0),
            ('continuity-c', 'character-c', 'GreyOS', 0);

        INSERT INTO CharacterGuildInstallationsV2 (
            id,
            character_id,
            continuity_id,
            guild_id,
            status,
            proxy_enabled
        )
        VALUES
            (1, 'character-a', 'continuity-a', 'guild-a', 'approved', 1),
            (2, 'character-b', 'continuity-b', 'guild-a', 'approved', 1),
            (3, 'character-c', 'continuity-c', 'guild-a', 'approved', 1);
    `);
}
