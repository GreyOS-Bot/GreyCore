const test =
    require("node:test");
const assert =
    require("node:assert/strict");

const {
    createIsolatedDatabase
} = require(
    "./helpers/isolatedDatabase"
);

test(
    "les sources de dÃ©ploiement groupÃ© excluent les archives et les personnages dÃ©jÃ  installÃ©s",
    () => {
        const isolated =
            createIsolatedDatabase({
                initializeSchema: true
            });

        try {
            seedDatabase(
                isolated.database
            );

            const repositoryPath =
                require.resolve(
                    "../src/v2/repositories/DeploymentRepository"
                );

            delete require.cache[
                repositoryPath
            ];

            const repository =
                require(
                    "../src/v2/repositories/DeploymentRepository"
                );

            const sources =
                repository.getDeployableSources(
                    "guild-beta"
                );

            assert.deepEqual(
                sources.map(source => source.id),
                [
                    "continuity-alba-original",
                    "continuity-vega-original"
                ]
            );
            assert.deepEqual(
                sources.map(source => source.proxy_name),
                [
                    "Alba",
                    "Vega"
                ]
            );
            assert.equal(
                sources[0].avatar_url,
                "https://image.test/alba.png"
            );
        } finally {
            isolated.cleanup();
        }
    }
);

function seedDatabase(database) {
    const now =
        "2026-07-27T18:00:00.000Z";

    database.exec(`
        INSERT INTO Guilds (
            id,
            name,
            created_at
        )
        VALUES
            ('guild-beta', 'Serveur Beta', '${now}'),
            ('guild-other', 'Autre serveur', '${now}');

        INSERT INTO UsersV2 (
            id,
            discord_user_id,
            created_at,
            updated_at
        )
        VALUES (1, 'owner', '${now}', '${now}');

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
        VALUES
            (
                'character-alba',
                1,
                'Alba',
                'https://image.test/alba.png',
                'personnage_joue',
                0,
                '${now}',
                '${now}'
            ),
            (
                'character-vega',
                1,
                'Vega',
                NULL,
                'pnj',
                0,
                '${now}',
                '${now}'
            ),
            (
                'character-present',
                1,
                'DÃ©jÃ  lÃ ',
                NULL,
                'personnage_joue',
                0,
                '${now}',
                '${now}'
            ),
            (
                'character-archived',
                1,
                'Archive',
                NULL,
                'personnage_joue',
                1,
                '${now}',
                '${now}'
            ),
            (
                'character-with-archived-story',
                1,
                'Histoire archivee',
                NULL,
                'personnage_joue',
                0,
                '${now}',
                '${now}'
            );

        INSERT INTO CharacterContinuitiesV2 (
            id,
            character_id,
            name,
            mode,
            is_archived,
            created_at,
            updated_at
        )
        VALUES
            (
                'continuity-alba-original',
                'character-alba',
                'Origine',
                'original',
                0,
                '2026-01-01T00:00:00.000Z',
                '${now}'
            ),
            (
                'continuity-alba-reset',
                'character-alba',
                'Autre vie',
                'reset',
                0,
                '2026-01-02T00:00:00.000Z',
                '${now}'
            ),
            (
                'continuity-vega-original',
                'character-vega',
                'Origine',
                'original',
                0,
                '${now}',
                '${now}'
            ),
            (
                'continuity-present',
                'character-present',
                'Origine',
                'original',
                0,
                '${now}',
                '${now}'
            ),
            (
                'continuity-archived-character',
                'character-archived',
                'Origine',
                'original',
                0,
                '${now}',
                '${now}'
            ),
            (
                'continuity-archived-story',
                'character-with-archived-story',
                'Origine',
                'original',
                1,
                '${now}',
                '${now}'
            );

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
        VALUES (
            'character-present',
            'continuity-present',
            'guild-beta',
            'approved',
            'private',
            1,
            '${now}',
            '${now}'
        );
    `);
}
