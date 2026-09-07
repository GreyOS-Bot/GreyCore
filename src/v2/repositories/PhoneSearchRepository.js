const db =
    require(
        "../../database/database"
    );

const SELECT_GREYCORE_PHONES = `
    SELECT
        phone.id
            AS phone_id,
        phone.phone_number,
        phone.continuity_id,
        continuity.character_id,
        COALESCE(
            NULLIF(profile.alias, ''),
            NULLIF(profile.firstname, ''),
            NULLIF(continuity.firstname, ''),
            character.proxy_name
        ) AS character_name,
        COALESCE(
            installation.local_avatar_url,
            character.avatar_url
        ) AS character_avatar_url

    FROM ContinuityPhonesV2 phone

    JOIN CharacterContinuitiesV2 continuity
        ON continuity.id =
            phone.continuity_id

    JOIN CharactersV2 character
        ON character.id =
            continuity.character_id

    LEFT JOIN CharacterProfilesV2 profile
        ON profile.continuity_id = continuity.id

    JOIN CharacterGuildInstallationsV2
        AS installation
        ON installation.continuity_id =
            continuity.id
`;

class PhoneSearchRepository {

    getPhoneById(
        phoneId
    ) {
        if (Number(phoneId) >= 1000000000) {
            return db.prepare("SELECT * FROM InstallationPhonesV2 WHERE id = ?")
                .get(phoneId);
        }
        return db.prepare(`
            SELECT *
            FROM ContinuityPhonesV2
            WHERE id = ?
        `).get(
            phoneId
        );
    }

    searchGreycore({
        viewerPhoneId,
        guildId,
        query
    }) {
        if (Number(viewerPhoneId) >= 1000000000) {
            const searchValue = `%${query}%`;
            return db.prepare(`
                SELECT phone.id AS phone_id, phone.phone_number, phone.continuity_id,
                       installation.character_id,
                       COALESCE(NULLIF(profile.alias,''), NULLIF(profile.firstname,''),
                                NULLIF(continuity.firstname,''), character.proxy_name) AS character_name,
                       COALESCE(installation.local_avatar_url, character.avatar_url) AS character_avatar_url
                FROM InstallationPhonesV2 phone
                JOIN InstallationPhonesV2 viewer ON viewer.id = ?
                JOIN CharacterGuildInstallationsV2 installation ON installation.id = phone.installation_id
                JOIN CharacterContinuitiesV2 continuity ON continuity.id = phone.continuity_id
                JOIN CharactersV2 character ON character.id = installation.character_id
                LEFT JOIN CharacterProfilesV2 profile ON profile.continuity_id = continuity.id
                WHERE phone.id != viewer.id AND phone.guild_id = viewer.guild_id
                  AND phone.context_id = viewer.context_id AND phone.is_active = 1
                  AND installation.status = 'approved' AND installation.proxy_enabled = 1
                  AND (LOWER(character.proxy_name) LIKE LOWER(?)
                    OR LOWER(COALESCE(profile.alias,'')) LIKE LOWER(?)
                    OR LOWER(COALESCE(profile.firstname,'')) LIKE LOWER(?)
                    OR phone.phone_number LIKE ?)
                ORDER BY character_name COLLATE NOCASE LIMIT 50
            `).all(viewerPhoneId, searchValue, searchValue, searchValue, searchValue);
        }
        const searchValue =
            `%${query}%`;
        const beginsWithValue =
            `${query}%`;

        return db.prepare(`
            ${SELECT_GREYCORE_PHONES}

            WHERE phone.is_active = 1
            AND phone.id != ?
            AND installation.guild_id = ?
            AND installation.status = 'approved'
            AND installation.proxy_enabled = 1
            AND (
                LOWER(
                    character.proxy_name
                ) LIKE LOWER(?)
                OR LOWER(COALESCE(profile.alias, '')) LIKE LOWER(?)
                OR LOWER(COALESCE(profile.firstname, '')) LIKE LOWER(?)
                OR LOWER(COALESCE(continuity.firstname, '')) LIKE LOWER(?)
                OR phone.phone_number LIKE ?
            )

            ORDER BY
                CASE
                    WHEN LOWER(
                        COALESCE(NULLIF(profile.alias, ''), NULLIF(profile.firstname, ''), NULLIF(continuity.firstname, ''), character.proxy_name)
                    ) = LOWER(?)
                    THEN 1

                    WHEN LOWER(
                        COALESCE(NULLIF(profile.alias, ''), NULLIF(profile.firstname, ''), NULLIF(continuity.firstname, ''), character.proxy_name)
                    ) LIKE LOWER(?)
                    THEN 2

                    ELSE 3
                END,
                character_name
                    COLLATE NOCASE ASC

            LIMIT 50
        `).all(
            viewerPhoneId,
            guildId,
            searchValue,
            searchValue,
            searchValue,
            searchValue,
            searchValue,
            query,
            beginsWithValue
        );
    }

    listGreycore({
        viewerPhoneId,
        guildId
    }) {
        if (Number(viewerPhoneId) >= 1000000000) {
            return db.prepare(`
                SELECT phone.id AS phone_id, phone.phone_number, phone.continuity_id,
                       installation.character_id,
                       COALESCE(NULLIF(profile.alias,''), NULLIF(profile.firstname,''),
                                NULLIF(continuity.firstname,''), character.proxy_name) AS character_name,
                       COALESCE(installation.local_avatar_url, character.avatar_url) AS character_avatar_url
                FROM InstallationPhonesV2 phone
                JOIN InstallationPhonesV2 viewer ON viewer.id = ?
                JOIN CharacterGuildInstallationsV2 installation ON installation.id = phone.installation_id
                JOIN CharacterContinuitiesV2 continuity ON continuity.id = phone.continuity_id
                JOIN CharactersV2 character ON character.id = installation.character_id
                LEFT JOIN CharacterProfilesV2 profile ON profile.continuity_id = continuity.id
                WHERE phone.id != viewer.id AND phone.guild_id = viewer.guild_id
                  AND phone.context_id = viewer.context_id AND phone.is_active = 1
                  AND installation.status = 'approved' AND installation.proxy_enabled = 1
                ORDER BY character_name COLLATE NOCASE LIMIT 25
            `).all(viewerPhoneId);
        }
        return db.prepare(`
            ${SELECT_GREYCORE_PHONES}

            WHERE phone.is_active = 1
            AND phone.id != ?
            AND installation.guild_id = ?
            AND installation.status = 'approved'
            AND installation.proxy_enabled = 1

            ORDER BY
                character_name
                    COLLATE NOCASE ASC

            LIMIT 25
        `).all(
            viewerPhoneId,
            guildId
        );
    }

}

module.exports =
    new PhoneSearchRepository();
