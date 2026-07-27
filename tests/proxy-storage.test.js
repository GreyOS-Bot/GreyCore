const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase,
    withMutedConsole
} = require(
    "./helpers/isolatedDatabase"
);

test(
    "les messages proxy conservent une référence V1 ou V2 explicite",
    async context => {
        const isolated =
            createIsolatedDatabase();

        context.after(
            () => isolated.cleanup()
        );

        await withMutedConsole(
            () =>
                require(
                    "../src/database/schema"
                ).initializeDatabase()
        );

        const now =
            new Date().toISOString();

        isolated.database
            .prepare(`
                INSERT INTO Guilds (
                    id,
                    name,
                    created_at
                )
                VALUES (?, ?, ?)
            `)
            .run(
                "guild",
                "Guild",
                now
            );

        isolated.database
            .prepare(`
                INSERT INTO Characters (
                    id,
                    guild_id,
                    owner_id,
                    name,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `)
            .run(
                "legacy-character",
                "guild",
                "owner",
                "Legacy",
                now,
                now
            );

        const user =
            isolated.database
                .prepare(`
                    INSERT INTO UsersV2 (
                        discord_user_id,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?)
                `)
                .run(
                    "owner-v2",
                    now,
                    now
                );

        isolated.database
            .prepare(`
                INSERT INTO CharactersV2 (
                    id,
                    owner_user_id,
                    proxy_name,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?)
            `)
            .run(
                "v2-character",
                user.lastInsertRowid,
                "V2",
                now,
                now
            );

        const proxyMessageManager =
            require(
                "../src/managers/ProxyMessageManager"
            );

        proxyMessageManager.save(
            proxyData(
                "legacy-message",
                "legacy-character"
            )
        );

        proxyMessageManager.save(
            proxyData(
                "v2-message",
                "v2-character"
            )
        );

        assert.equal(
            proxyMessageManager
                .get("legacy-message")
                .character_version,
            "v1"
        );

        assert.equal(
            proxyMessageManager
                .get("v2-message")
                .character_version,
            "v2"
        );
    }
);

function proxyData(
    discordMessageId,
    characterId
) {
    return {
        discordMessageId,
        webhookMessageId:
            `webhook-${discordMessageId}`,
        webhookId:
            "webhook",
        channelId:
            "channel",
        guildId:
            "guild",
        authorId:
            "author",
        characterId
    };
}
