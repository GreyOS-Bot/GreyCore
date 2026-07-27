const db =
    require("../../database/database");

class AssetRepository {

    getById(assetId) {
        return db.prepare(`
            SELECT
                asset.*,
                type.label AS type_label,
                type.emoji AS type_emoji,
                type.type_key,
                continuity.character_id,
                character.proxy_name AS owner_name,
                owner.discord_user_id AS owner_discord_user_id

            FROM ContinuityAssetsV2 AS asset

            JOIN AssetTypesV2 AS type
                ON type.id = asset.asset_type_id

            JOIN CharacterContinuitiesV2 AS continuity
                ON continuity.id = asset.continuity_id

            JOIN CharactersV2 AS character
                ON character.id = continuity.character_id

            JOIN UsersV2 AS owner
                ON owner.id = character.owner_user_id

            WHERE asset.id = ?
        `).get(assetId);
    }

    getForContinuity(guildId, continuityId) {
        return db.prepare(`
            SELECT
                asset.*,
                type.label AS type_label,
                type.emoji AS type_emoji,
                type.type_key

            FROM ContinuityAssetsV2 AS asset

            JOIN AssetTypesV2 AS type
                ON type.id = asset.asset_type_id

            WHERE asset.guild_id = ?
            AND asset.continuity_id = ?

            ORDER BY
                type.sort_order ASC,
                type.label COLLATE NOCASE ASC,
                asset.name COLLATE NOCASE ASC,
                asset.id ASC
        `).all(
            guildId,
            continuityId
        );
    }

    countForContinuity(guildId, continuityId) {
        return db.prepare(`
            SELECT COUNT(*) AS count
            FROM ContinuityAssetsV2
            WHERE guild_id = ?
            AND continuity_id = ?
        `).get(
            guildId,
            continuityId
        )?.count || 0;
    }

    getContinuityForGuild(guildId, continuityId) {
        return db.prepare(`
            SELECT
                continuity.id,
                continuity.character_id,
                character.proxy_name

            FROM CharacterContinuitiesV2 AS continuity

            JOIN CharactersV2 AS character
                ON character.id = continuity.character_id

            JOIN CharacterGuildInstallationsV2 AS installation
                ON installation.continuity_id = continuity.id
                AND installation.character_id = character.id

            WHERE continuity.id = ?
            AND installation.guild_id = ?
            AND installation.status = 'approved'
            AND installation.proxy_enabled = 1
            AND character.is_archived = 0
            AND continuity.is_archived = 0
            LIMIT 1
        `).get(
            continuityId,
            guildId
        );
    }

    create(data) {
        const result = db.prepare(`
            INSERT INTO ContinuityAssetsV2 (
                guild_id,
                continuity_id,
                asset_type_id,
                name,
                description,
                details,
                image_url,
                created_by,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            data.guildId,
            data.continuityId,
            data.assetTypeId,
            data.name,
            data.description,
            data.details,
            data.imageUrl,
            data.createdBy,
            data.createdAt,
            data.updatedAt
        );

        return this.getById(
            result.lastInsertRowid
        );
    }

    update(assetId, data) {
        db.prepare(`
            UPDATE ContinuityAssetsV2
            SET
                name = ?,
                description = ?,
                details = ?,
                image_url = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            data.name,
            data.description,
            data.details,
            data.imageUrl,
            data.updatedAt,
            assetId
        );

        return this.getById(assetId);
    }

    transfer(asset, data) {
        const execute = db.transaction(() => {
            db.prepare(`
                UPDATE ContinuityAssetsV2
                SET
                    continuity_id = ?,
                    updated_at = ?
                WHERE id = ?
            `).run(
                data.toContinuityId,
                data.createdAt,
                asset.id
            );

            db.prepare(`
                INSERT INTO ContinuityAssetTransfersV2 (
                    asset_id,
                    guild_id,
                    from_continuity_id,
                    to_continuity_id,
                    transferred_by,
                    note,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                asset.id,
                asset.guild_id,
                asset.continuity_id,
                data.toContinuityId,
                data.transferredBy,
                data.note,
                data.createdAt
            );
        });

        execute();

        return this.getById(asset.id);
    }

    getTransfers(assetId, limit = 20) {
        return db.prepare(`
            SELECT
                transfer.*,

                source_character.proxy_name
                    AS from_character_name,

                target_character.proxy_name
                    AS to_character_name

            FROM ContinuityAssetTransfersV2 AS transfer

            LEFT JOIN CharacterContinuitiesV2
                AS source_continuity
                ON source_continuity.id =
                    transfer.from_continuity_id

            LEFT JOIN CharactersV2 AS source_character
                ON source_character.id =
                    source_continuity.character_id

            LEFT JOIN CharacterContinuitiesV2
                AS target_continuity
                ON target_continuity.id =
                    transfer.to_continuity_id

            LEFT JOIN CharactersV2 AS target_character
                ON target_character.id =
                    target_continuity.character_id

            WHERE transfer.asset_id = ?

            ORDER BY
                transfer.created_at DESC,
                transfer.id DESC

            LIMIT ?
        `).all(assetId, limit);
    }

    delete(assetId) {
        return db.prepare(`
            DELETE FROM ContinuityAssetsV2
            WHERE id = ?
        `).run(assetId);
    }
}

module.exports =
    new AssetRepository();
