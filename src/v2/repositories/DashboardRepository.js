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

            JOIN CharacterContinuitiesV2
                AS continuity
                ON continuity.id =
                    installation.continuity_id

            LEFT JOIN CharacterProfilesV2
                AS profile
                ON profile.continuity_id =
                    continuity.id

            WHERE installation.guild_id = ?
            AND installation.status = 'approved'
            AND installation.proxy_enabled = 1
            AND character.is_archived = 0
            AND (
                LOWER(character.proxy_name) =
                    LOWER(?)

                OR EXISTS (
                    SELECT 1
                    FROM CharacterAliasesV2
                        AS characterAlias
                    WHERE characterAlias.character_id =
                        character.id
                    AND LOWER(characterAlias.alias) =
                        LOWER(?)
                )

                OR LOWER(
                    COALESCE(profile.alias, '')
                ) = LOWER(?)

                OR LOWER(
                    COALESCE(profile.firstname, '')
                ) = LOWER(?)

                OR LOWER(
                    COALESCE(continuity.firstname, '')
                ) = LOWER(?)

                OR LOWER(
                    COALESCE(character.base_firstname, '')
                ) = LOWER(?)
            )

            ORDER BY installation.installed_at ASC
        `).all(
            guildId,
            proxyName,
            proxyName,
            proxyName,
            proxyName,
            proxyName,
            proxyName
        );
    }

}

module.exports =
    new DashboardRepository();
