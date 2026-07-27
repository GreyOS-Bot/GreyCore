const db =
    require("../../database/database");

const characterManager =
    require(
        "../../managers/CharacterManager"
    );

const characterTypes =
    require(
        "../../v2/core/character/CharacterTypeCatalog"
    );

function resolveProxyCharacter({
    discordUserId,
    guildId,
    proxyName,
    isStaff = false
}) {
    let character =
        findPlayableV2Character({
            discordUserId,
            guildId,
            proxyName,
            isStaff
        });

    const v2Installation =
        findV2Installation({
            discordUserId,
            guildId,
            proxyName,
            isStaff
        });

    if (
        !character
        &&
        !v2Installation
    ) {
        character =
            characterManager
                .getCharacterForProxy(
                    guildId,
                    discordUserId,
                    proxyName
                );
    }

    return {
        character,
        v2Installation
    };
}

function resolveCharacterByReference({
    characterId,
    characterVersion
}) {
    if (
        characterVersion === "v2"
    ) {
        return findV2CharacterById(
            characterId
        );
    }

    const legacyCharacter =
        characterManager
            .getCharacterById(
                characterId
            );

    if (legacyCharacter) {
        return legacyCharacter;
    }

    const mapping =
        db.prepare(`
            SELECT new_id
            FROM MigrationV1ToV2
            WHERE entity_type = 'character'
            AND old_id = ?
            LIMIT 1
        `).get(characterId);

    if (!mapping) {
        return null;
    }

    return findV2CharacterById(
        mapping.new_id
    );
}

function matchesCharacterReference(
    character,
    {
        characterId,
        characterVersion
    }
) {
    if (
        String(character.id) ===
        String(characterId)
    ) {
        return true;
    }

    if (
        characterVersion !== "v1"
    ) {
        return false;
    }

    const mapping =
        db.prepare(`
            SELECT 1
            FROM MigrationV1ToV2
            WHERE entity_type = 'character'
            AND old_id = ?
            AND new_id = ?
            LIMIT 1
        `).get(
            characterId,
            character.id
        );

    return Boolean(mapping);
}

function findV2CharacterById(
    characterId
) {
    return db.prepare(`
        SELECT
            id,
            proxy_name AS name,
            avatar_url AS avatar
        FROM CharactersV2
        WHERE id = ?
        LIMIT 1
    `).get(characterId);
}

function findPlayableV2Character({
    discordUserId,
    guildId,
    proxyName,
    isStaff
}) {
    const installation =
        findV2Installation({
            discordUserId,
            guildId,
            proxyName,
            isStaff
        });

    if (
        !installation
        || installation.access_denied
        || installation.status !== "approved"
        || Number(
            installation.proxy_enabled
        ) !== 1
    ) {
        return null;
    }

    return {
        id:
            installation.character_id,
        name:
            installation.proxy_name,
        avatar:
            installation.avatar
    };
}

function findV2Installation({
    discordUserId,
    guildId,
    proxyName,
    isStaff
}) {
    const installation = db.prepare(`
        SELECT
            character.id AS character_id,
            character.proxy_name,
            character.character_type,
            user.discord_user_id,
            installation.status,
            installation.proxy_enabled,
            COALESCE(
                installation.local_avatar_url,
                character.avatar_url
            ) AS avatar

        FROM CharactersV2 character

        JOIN UsersV2 user
            ON user.id =
                character.owner_user_id

        JOIN CharacterGuildInstallationsV2
            installation
            ON installation.character_id =
                character.id

        WHERE installation.guild_id = ?
        AND LOWER(character.proxy_name) =
            LOWER(?)
        AND character.is_archived = 0
        AND (
            user.discord_user_id = ?
            OR character.character_type = 'random'
            OR character.character_type IN (
                'pnj_reserve',
                'reserve_staff'
            )
        )

        ORDER BY
            CASE
                WHEN user.discord_user_id = ?
                    THEN 0
                WHEN character.character_type = 'random'
                    THEN 1
                ELSE 2
            END,
            installation.installed_at ASC

        LIMIT 1
    `).get(
        guildId,
        proxyName,
        discordUserId,
        discordUserId
    );

    if (!installation) {
        return null;
    }

    return {
        ...installation,
        access_denied:
            !canUseCharacterType(
                installation.character_type,
                installation.discord_user_id,
                discordUserId,
                isStaff
            )
    };
}

function canUseCharacterType(
    characterType,
    ownerDiscordUserId,
    actorDiscordUserId,
    isStaff
) {
    const usageScope =
        characterTypes.getUsageScope(
            characterType
        );

    if (usageScope === "shared") {
        return true;
    }

    if (usageScope === "staff") {
        return isStaff === true;
    }

    return String(ownerDiscordUserId) ===
        String(actorDiscordUserId);
}

module.exports = {
    resolveProxyCharacter,
    resolveCharacterByReference,
    matchesCharacterReference
};
