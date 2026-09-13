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
        const scope=this.resolveScope(data,characterReference);

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
                created_at, installation_id, context_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            data.discordMessageId,
            data.webhookMessageId,
            data.webhookId,
            data.channelId,
            data.guildId,
            data.authorId,
            characterReference.id,
            characterReference.version,
            new Date().toISOString(), scope.installationId, scope.contextId
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
        const scope=this.resolveScope(data,characterReference);

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
                    created_at, installation_id, context_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                data.discordMessageId,
                data.webhookMessageId,
                data.webhookId,
                data.channelId,
                data.guildId,
                data.authorId,
                characterReference.id,
                characterReference.version,
                new Date().toISOString(), scope.installationId, scope.contextId
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

    resolveScope(data,characterReference){
        if(characterReference.version!=="v2")return {installationId:null,contextId:null};
        if(!data.installationId||!data.contextId){
            const candidates=db.prepare("SELECT id FROM CharacterGuildInstallationsV2 WHERE guild_id=? AND character_id=?").all(data.guildId,characterReference.id);
            if(candidates.length)throw new Error("Le Context et l’Installation sont obligatoires pour un nouveau ProxyMessage V2.");
            return {installationId:null,contextId:null};
        }
        const row=db.prepare(`SELECT id,guild_id,context_id,character_id FROM CharacterGuildInstallationsV2 WHERE id=?`).get(data.installationId);
        if(!row||String(row.guild_id)!==String(data.guildId)||String(row.context_id)!==String(data.contextId)||String(row.character_id)!==String(characterReference.id))throw new Error("ProxyMessage hors du Context de l’Installation.");
        return {installationId:row.id,contextId:row.context_id};
    }

    requireScoped(record,{guildId,contextId,installationId,actorId=null}){
        if(!record||String(record.guild_id)!==String(guildId))throw new Error("Message proxy introuvable dans cette Guild.");
        if(record.character_version!=="v2"||record.installation_id===null)return record;
        if(String(record.context_id)!==String(contextId)||String(record.installation_id)!==String(installationId))throw new Error("Message proxy introuvable dans ce Context.");
        const row=db.prepare(`SELECT i.id,i.guild_id,i.context_id,i.character_id,u.discord_user_id owner_id FROM CharacterGuildInstallationsV2 i JOIN CharactersV2 c ON c.id=i.character_id JOIN UsersV2 u ON u.id=c.owner_user_id WHERE i.id=?`).get(record.installation_id);
        if(!row||String(row.guild_id)!==String(record.guild_id)||String(row.context_id)!==String(record.context_id)||String(row.character_id)!==String(record.character_id))throw new Error("Scope ProxyMessage invalide.");
        if(actorId!==null&&String(record.author_id)!==String(actorId))throw new Error("Tu ne peux modifier que tes propres messages proxy.");
        return record;
    }
}

module.exports =
    new ProxyMessageManager();
