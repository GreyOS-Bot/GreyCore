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
        character.proxy_name
            AS character_name,
        character.avatar_url
            AS character_avatar_url

    FROM ContinuityPhonesV2 phone

    JOIN CharacterContinuitiesV2 continuity
        ON continuity.id =
            phone.continuity_id

    JOIN CharactersV2 character
        ON character.id =
            continuity.character_id

    JOIN CharacterGuildInstallationsV2
        AS installation
        ON installation.continuity_id =
            continuity.id
`;

class PhoneSearchRepository {

    getPhoneById(
        phoneId
    ) {
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
                OR phone.phone_number LIKE ?
            )

            ORDER BY
                CASE
                    WHEN LOWER(
                        character.proxy_name
                    ) = LOWER(?)
                    THEN 1

                    WHEN LOWER(
                        character.proxy_name
                    ) LIKE LOWER(?)
                    THEN 2

                    ELSE 3
                END,
                character.proxy_name
                    COLLATE NOCASE ASC

            LIMIT 50
        `).all(
            viewerPhoneId,
            guildId,
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
        return db.prepare(`
            ${SELECT_GREYCORE_PHONES}

            WHERE phone.is_active = 1
            AND phone.id != ?
            AND installation.guild_id = ?
            AND installation.status = 'approved'
            AND installation.proxy_enabled = 1

            ORDER BY
                character.proxy_name
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
