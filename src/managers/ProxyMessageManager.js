const db =
    require("../database/database");

const {
    randomUUID
} = require("node:crypto");

const CLAIM_TTL_MS =
    15 * 60 * 1000;

class ProxyMessageManager {
    claim(discordMessageId) {
        const claimToken =
            randomUUID();
        const claimedAt =
            new Date().toISOString();
        const staleBefore =
            new Date(
                Date.now() - CLAIM_TTL_MS
            ).toISOString();

        return db.transaction(() => {
            if (this.get(discordMessageId)) {
                return null;
            }

            db.prepare(`
                DELETE FROM ProxyMessageClaims
                WHERE discord_message_id = ?
                AND claimed_at < ?
            `).run(
                discordMessageId,
                staleBefore
            );

            const result =
                db.prepare(`
                    INSERT OR IGNORE INTO ProxyMessageClaims (
                        discord_message_id,
                        claim_token,
                        claimed_at
                    )
                    VALUES (?, ?, ?)
                `).run(
                    discordMessageId,
                    claimToken,
                    claimedAt
                );

            return result.changes === 1
                ? claimToken
                : null;
        })();
    }

    releaseClaim(
        discordMessageId,
        claimToken
    ) {
        return db.prepare(`
            DELETE FROM ProxyMessageClaims
            WHERE discord_message_id = ?
            AND claim_token = ?
        `).run(
            discordMessageId,
            claimToken
        );
    }

    refreshClaim(
        discordMessageId,
        claimToken
    ) {
        return db.prepare(`
            UPDATE ProxyMessageClaims
            SET claimed_at = ?
            WHERE discord_message_id = ?
            AND claim_token = ?
        `).run(
            new Date().toISOString(),
            discordMessageId,
            claimToken
        );
    }

    resolveCharacterReference(
        characterId
    ) {
        const v2Character =
            db.prepare(`
                SELECT id
                FROM CharactersV2
                WHERE id = ?
            `).get(characterId);

        if (v2Character) {
            return {
                id:
                    v2Character.id,
                version:
                    "v2"
            };
        }

        const legacyCharacter =
            db.prepare(`
                SELECT id
                FROM Characters
                WHERE id = ?
            `).get(characterId);

        if (legacyCharacter) {
            return {
                id:
                    legacyCharacter.id,
                version:
                    "v1"
            };
        }

        return null;
    }

    save(data) {
        const characterReference =
            this.resolveCharacterReference(
                data.characterId
            );

        if (!characterReference) {
            console.warn(
                `⚠️ Message proxy non enregistré : personnage ${data.characterId} introuvable.`
            );

            return null;
        }

        db.prepare(`
            INSERT INTO ProxyMessages (
                discord_message_id,
                webhook_message_id,
                webhook_id,
                channel_id,
                guild_id,
                author_id,
                character_id,
                character_version,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            data.discordMessageId,
            data.webhookMessageId,
            data.webhookId,
            data.channelId,
            data.guildId,
            data.authorId,
            characterReference.id,
            characterReference.version,
            new Date().toISOString()
        );

        return true;
    }

    completeClaim(
        data,
        claimToken
    ) {
        const characterReference =
            this.resolveCharacterReference(
                data.characterId
            );

        if (!characterReference) {
            throw new Error(
                `Message proxy non enregistré : personnage ${data.characterId} introuvable.`
            );
        }

        return db.transaction(() => {
            const claim =
                db.prepare(`
                    SELECT claim_token
                    FROM ProxyMessageClaims
                    WHERE discord_message_id = ?
                `).get(
                    data.discordMessageId
                );

            if (
                !claim
                || claim.claim_token !== claimToken
            ) {
                throw new Error(
                    "La réservation de ce message proxy n’est plus active."
                );
            }

            db.prepare(`
                INSERT INTO ProxyMessages (
                    discord_message_id,
                    webhook_message_id,
                    webhook_id,
                    channel_id,
                    guild_id,
                    author_id,
                    character_id,
                    character_version,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                data.discordMessageId,
                data.webhookMessageId,
                data.webhookId,
                data.channelId,
                data.guildId,
                data.authorId,
                characterReference.id,
                characterReference.version,
                new Date().toISOString()
            );

            const released =
                this.releaseClaim(
                    data.discordMessageId,
                    claimToken
                );

            if (released.changes !== 1) {
                throw new Error(
                    "La réservation de ce message proxy n’a pas pu être finalisée."
                );
            }

            return true;
        })();
    }

    get(discordMessageId) {
        return db.prepare(`
            SELECT *
            FROM ProxyMessages
            WHERE discord_message_id = ?
        `).get(discordMessageId);
    }

    delete(discordMessageId) {
        return db.prepare(`
            DELETE FROM ProxyMessages
            WHERE discord_message_id = ?
        `).run(discordMessageId);
    }

    deleteIfMatches({
        discordMessageId,
        webhookMessageId,
        webhookId
    }) {
        return db.prepare(`
            DELETE FROM ProxyMessages
            WHERE discord_message_id = ?
            AND webhook_message_id = ?
            AND webhook_id = ?
        `).run(
            discordMessageId,
            webhookMessageId,
            webhookId
        );
    }

    getByWebhookMessageId(
        webhookMessageId
    ) {
        return db.prepare(`
            SELECT *
            FROM ProxyMessages
            WHERE webhook_message_id = ?
        `).get(webhookMessageId);
    }
}

module.exports =
    new ProxyMessageManager();
