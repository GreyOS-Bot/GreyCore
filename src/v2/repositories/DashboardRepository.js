const db =
    require(
        "../../database/database"
    );

class DashboardRepository {

    resolveV2CharacterId(
        legacyCharacterId
    ) {
        return db.prepare(`
            SELECT new_id
            FROM MigrationV1ToV2
            WHERE entity_type = 'character'
            AND old_id = ?
            LIMIT 1
        `).get(
            legacyCharacterId
        )?.new_id
        ?? null;
    }

    getInstalledCharacterReferences(
        guildId
    ) {
        return db.prepare(`
            SELECT DISTINCT
                character_id,
                continuity_id
            FROM CharacterGuildInstallationsV2
            WHERE guild_id = ?
            AND status = 'approved'
            AND proxy_enabled = 1
        `).all(
            guildId
        );
    }

    getSearchableCharacterReferences(
        guildId,
        excludeCharacterId
    ) {
        return db.prepare(`
            SELECT
                character.id AS character_id,
                continuity.id AS continuity_id

            FROM CharacterGuildInstallationsV2
                AS installation

            JOIN CharactersV2 AS character
                ON character.id =
                    installation.character_id

            JOIN CharacterContinuitiesV2
                AS continuity
                ON continuity.id =
                    installation.continuity_id

            WHERE installation.guild_id = ?
            AND installation.status = 'approved'
            AND installation.proxy_enabled = 1
            AND character.is_archived = 0
            AND (
                ? IS NULL
                OR character.id <> ?
            )

            ORDER BY
                installation.installed_at ASC,
                character.proxy_name
                    COLLATE NOCASE ASC
        `).all(
            guildId,
            excludeCharacterId,
            excludeCharacterId
        );
    }

    getPlayableProxyReferences(
        guildId,
        proxyName
    ) {
        return db.prepare(`
            SELECT
                installation.character_id,
                installation.continuity_id

            FROM CharacterGuildInstallationsV2
                AS installation

            JOIN CharactersV2 AS character
                ON character.id =
                    installation.character_id

            WHERE installation.guild_id = ?
            AND installation.status = 'approved'
            AND installation.proxy_enabled = 1
            AND character.is_archived = 0
            AND LOWER(character.proxy_name) =
                LOWER(?)

            ORDER BY installation.installed_at ASC
        `).all(
            guildId,
            proxyName
        );
    }

}

module.exports =
    new DashboardRepository();
