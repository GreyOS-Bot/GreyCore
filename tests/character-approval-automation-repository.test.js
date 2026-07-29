const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require("./helpers/isolatedDatabase");

test(
    "la configuration et le garde-fou des automatisations restent isolés par serveur et membre",
    context => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });

        context.after(
            () => isolated.cleanup()
        );

        const repositoryPath =
            require.resolve(
                "../src/v2/repositories/CharacterApprovalAutomationRepository"
            );

        delete require.cache[repositoryPath];

        const repository =
            require(
                "../src/v2/repositories/CharacterApprovalAutomationRepository"
            );

        seedApprovedCharacters(
            isolated.database
        );

        const configuration =
            repository.saveConfiguration({
                guildId: "guild",
                approvedCharacterCount: 2,
                requiredRoleId: "newcomer",
                removeRoleId: "newcomer",
                addRoleId: "member",
                welcomeChannelId: "welcome",
                welcomeMessage: "Bienvenue {user}",
                updatedAt: "2026-07-30T12:00:00.000Z"
            });

        assert.equal(configuration.is_enabled, 1);
        assert.equal(
            repository.countApprovedCharacters(
                "guild",
                "player"
            ),
            2
        );

        assert.equal(
            repository.claimRun({
                guildId: "guild",
                discordUserId: "player",
                approvedCharacterCount: 2,
                claimedAt: "2026-07-30T12:00:00.000Z"
            }),
            true
        );

        assert.equal(
            repository.claimRun({
                guildId: "guild",
                discordUserId: "player",
                approvedCharacterCount: 2,
                claimedAt: "2026-07-30T12:01:00.000Z"
            }),
            false
        );

        repository.completeRun({
            guildId: "guild",
            discordUserId: "player",
            completedAt: "2026-07-30T12:01:00.000Z"
        });

        assert.equal(
            repository.getRun(
                "guild",
                "player"
            ).status,
            "completed"
        );

        assert.equal(
            repository.claimRun({
                guildId: "guild",
                discordUserId: "player",
                approvedCharacterCount: 3,
                claimedAt: "2026-07-31T12:00:00.000Z"
            }),
            false
        );
    }
);

function seedApprovedCharacters(database) {
    database.prepare(`
        INSERT INTO Guilds (
            id,
            name,
            created_at
        )
        VALUES ('guild', 'GreyOS', '2026-07-30T00:00:00.000Z')
    `).run();

    database.prepare(`
        INSERT INTO UsersV2 (
            discord_user_id,
            created_at,
            updated_at
        )
        VALUES ('player', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z')
    `).run();

    for (const number of [1, 2]) {
        database.prepare(`
            INSERT INTO CharactersV2 (
                id,
                owner_user_id,
                proxy_name,
                character_type,
                created_at,
                updated_at
            )
            VALUES (?, 1, ?, 'personnage_joue', ?, ?)
        `).run(
            `character-${number}`,
            `Character ${number}`,
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
            `continuity-${number}`,
            `character-${number}`,
            "2026-07-30T00:00:00.000Z",
            "2026-07-30T00:00:00.000Z"
        );

        database.prepare(`
            INSERT INTO CharacterGuildInstallationsV2 (
                character_id,
                continuity_id,
                guild_id,
                status,
                visibility,
                proxy_enabled,
                installed_at,
                updated_at
            )
            VALUES (?, ?, 'guild', 'approved', 'private', 1, ?, ?)
        `).run(
            `character-${number}`,
            `continuity-${number}`,
            "2026-07-30T00:00:00.000Z",
            "2026-07-30T00:00:00.000Z"
        );
    }
}
