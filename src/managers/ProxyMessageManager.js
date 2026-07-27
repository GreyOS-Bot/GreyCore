const db =
    require("../database/database");

class ProxyMessageManager {
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
