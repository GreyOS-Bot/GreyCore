const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require("./helpers/isolatedDatabase");

test(
    "Greybot receives only approved playable characters installed on its guild",
    context => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });

        context.after(
            () => isolated.cleanup()
        );

        seedCharacters(isolated.database);

        const source = loadSource();

        assert.deepEqual(
            source.getPlayableCharactersForGuild(
                "guild-a"
            ),
            [
                {
                    id: "pj-local",
                    guild_id: "guild-a",
                    owner_id: "owner-alpha",
                    name: "Alpha",
                    avatar: "https://cdn.example/alpha-local.png"
                },
                {
                    id: "pj-global",
                    guild_id: "guild-a",
                    owner_id: "owner-beta",
                    name: "Beta",
                    avatar: "https://cdn.example/beta-global.png"
                }
            ]
        );

        assert.deepEqual(
            source.getPlayableCharactersForGuild(
                "guild-unconfigured"
            ),
            []
        );
    }
);

function loadSource() {
    const modules = [
        "../src/v2/repositories/InstallationRepository",
        "../src/v2/managers/InstallationV2Manager",
        "../src/integrations/GreybotCharacterSource"
    ];

    for (const modulePath of modules) {
        delete require.cache[
            require.resolve(modulePath)
        ];
    }

    return require(
        "../src/integrations/GreybotCharacterSource"
    );
}

function seedCharacters(database) {
    database.prepare(`
        INSERT INTO Guilds (
            id,
            name,
            created_at
        )
        VALUES
            ('guild-a', 'Guild A', '2026-07-30T00:00:00.000Z'),
            ('guild-b', 'Guild B', '2026-07-30T00:00:00.000Z')
    `).run();

    const rows = [
        {
            id: "pj-local",
            ownerId: "owner-alpha",
            proxyName: "Alpha",
            globalAvatar: "https://cdn.example/alpha-global.png",
            localAvatar: "https://cdn.example/alpha-local.png",
            type: "personnage_joue",
            archived: 0,
            guildId: "guild-a",
            status: "approved",
            proxyEnabled: 1
        },
        {
            id: "pj-global",
            ownerId: "owner-beta",
            proxyName: "Beta",
            globalAvatar: "https://cdn.example/beta-global.png",
            localAvatar: null,
            type: "personnage_joue",
            archived: 0,
            guildId: "guild-a",
            status: "approved",
            proxyEnabled: 1
        },
        {
            id: "pnj",
            ownerId: "owner-pnj",
            proxyName: "Charlie",
            type: "pnj",
            archived: 0,
            guildId: "guild-a",
            status: "approved",
            proxyEnabled: 1
        },
        {
            id: "archived",
            ownerId: "owner-archived",
            proxyName: "Delta",
            type: "personnage_joue",
            archived: 1,
            guildId: "guild-a",
            status: "approved",
            proxyEnabled: 1
        },
        {
            id: "disabled",
            ownerId: "owner-disabled",
            proxyName: "Echo",
            type: "personnage_joue",
            archived: 0,
            guildId: "guild-a",
            status: "approved",
            proxyEnabled: 0
        },
        {
            id: "draft",
            ownerId: "owner-draft",
            proxyName: "Foxtrot",
            type: "personnage_joue",
            archived: 0,
            guildId: "guild-a",
            status: "draft",
            proxyEnabled: 1
        },
        {
            id: "other-guild",
            ownerId: "owner-other",
            proxyName: "Gamma",
            type: "personnage_joue",
            archived: 0,
            guildId: "guild-b",
            status: "approved",
            proxyEnabled: 1
        }
    ];

    for (const [index, row] of rows.entries()) {
        const ownerId = index + 1;
        const continuityId = `continuity-${row.id}`;

        database.prepare(`
            INSERT INTO UsersV2 (
                id,
                discord_user_id,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?)
        `).run(
            ownerId,
            row.ownerId,
            "2026-07-30T00:00:00.000Z",
            "2026-07-30T00:00:00.000Z"
        );

        database.prepare(`
            INSERT INTO CharactersV2 (
                id,
                owner_user_id,
                proxy_name,
                avatar_url,
                character_type,
                is_archived,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            row.id,
            ownerId,
            row.proxyName,
            row.globalAvatar || null,
            row.type,
            row.archived,
            "2026-07-30T00:00:00.000Z",
            "2026-07-30T00:00:00.000Z"
        );

        database.prepare(`
            INSERT INTO CharacterContinuitiesV2 (
                id,
                character_id,
                name,
                created_at,
                updated_at
            )
            VALUES (?, ?, 'Original', ?, ?)
        `).run(
            continuityId,
            row.id,
            "2026-07-30T00:00:00.000Z",
            "2026-07-30T00:00:00.000Z"
        );

        database.prepare(`
            INSERT INTO CharacterGuildInstallationsV2 (
                character_id,
                continuity_id,
                guild_id,
                status,
                proxy_enabled,
                local_avatar_url,
                installed_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            row.id,
            continuityId,
            row.guildId,
            row.status,
            row.proxyEnabled,
            row.localAvatar || null,
            "2026-07-30T00:00:00.000Z",
            "2026-07-30T00:00:00.000Z"
        );
    }
}
