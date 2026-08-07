const db = require("../../database/database");

class NarrativeEntityRepository {
    getByGuild(guildId) {
        return db.prepare(`
            SELECT * FROM NarrativeEntitiesV2
            WHERE guild_id = ? ORDER BY name COLLATE NOCASE ASC
        `).all(guildId).map(row => this.hydrate(row));
    }

    getById(guildId, entityId) {
        const row = db.prepare(`
            SELECT * FROM NarrativeEntitiesV2
            WHERE guild_id = ? AND id = ?
        `).get(guildId, entityId);
        return row ? this.hydrate(row) : null;
    }

    getEnabledForTrigger(guildId, triggerKey) {
        return db.prepare(`
            SELECT entity.* FROM NarrativeEntitiesV2 entity
            JOIN NarrativeEntityTriggersV2 trigger ON trigger.entity_id = entity.id
            WHERE entity.guild_id = ? AND entity.is_enabled = 1
              AND trigger.trigger_key = ?
            ORDER BY entity.name COLLATE NOCASE ASC
        `).all(guildId, triggerKey).map(row => this.hydrate(row));
    }

    create(entity) {
        const run = db.transaction(() => {
            db.prepare(`
                INSERT INTO NarrativeEntitiesV2 (
                    id, guild_id, name, avatar_url, embed_color, description,
                    is_enabled, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                entity.id, entity.guildId, entity.name, entity.avatarUrl,
                entity.embedColor, entity.description, entity.isEnabled ? 1 : 0,
                entity.createdBy, entity.now, entity.now
            );
            this.replaceTriggers(entity.id, entity.triggers, entity.now);
            this.replaceMessages(entity.id, entity.messages, entity.now);
        });
        run();
        return this.getById(entity.guildId, entity.id);
    }

    update(entity) {
        const run = db.transaction(() => {
            db.prepare(`
                UPDATE NarrativeEntitiesV2 SET
                    name = ?, avatar_url = ?, embed_color = ?, description = ?,
                    updated_at = ?
                WHERE guild_id = ? AND id = ?
            `).run(
                entity.name, entity.avatarUrl, entity.embedColor,
                entity.description, entity.now, entity.guildId, entity.id
            );
            if (entity.messages) this.replaceMessages(entity.id, entity.messages, entity.now);
        });
        run();
        return this.getById(entity.guildId, entity.id);
    }

    setEnabled(guildId, entityId, enabled, now) {
        db.prepare(`
            UPDATE NarrativeEntitiesV2 SET is_enabled = ?, updated_at = ?
            WHERE guild_id = ? AND id = ?
        `).run(enabled ? 1 : 0, now, guildId, entityId);
        return this.getById(guildId, entityId);
    }

    setTriggers(guildId, entityId, triggers, now) {
        const entity = this.getById(guildId, entityId);
        if (!entity) return null;
        const run = db.transaction(() => this.replaceTriggers(entityId, triggers, now));
        run();
        return this.getById(guildId, entityId);
    }

    setScopes(guildId, entityId, channelIds, now) {
        const entity = this.getById(guildId, entityId);
        if (!entity) return null;
        const run = db.transaction(() => this.replaceScopes(entityId, channelIds, now));
        run();
        return this.getById(guildId, entityId);
    }

    delete(guildId, entityId) {
        return db.prepare(`
            DELETE FROM NarrativeEntitiesV2 WHERE guild_id = ? AND id = ?
        `).run(guildId, entityId).changes > 0;
    }

    getMessages(entityId, triggerKey = null) {
        return db.prepare(`
            SELECT * FROM NarrativeEntityMessagesV2
            WHERE entity_id = ? AND is_enabled = 1
              AND (trigger_key = ? OR trigger_key IS NULL)
            ORDER BY id ASC
        `).all(entityId, triggerKey);
    }

    replaceTriggers(entityId, triggers, now) {
        db.prepare("DELETE FROM NarrativeEntityTriggersV2 WHERE entity_id = ?").run(entityId);
        const insert = db.prepare(`
            INSERT INTO NarrativeEntityTriggersV2 (entity_id, trigger_key, created_at)
            VALUES (?, ?, ?)
        `);
        for (const trigger of triggers || []) insert.run(entityId, trigger, now);
    }

    replaceMessages(entityId, messages, now) {
        db.prepare("DELETE FROM NarrativeEntityMessagesV2 WHERE entity_id = ?").run(entityId);
        const insert = db.prepare(`
            INSERT INTO NarrativeEntityMessagesV2 (
                entity_id, trigger_key, content, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?)
        `);
        for (const message of messages || []) {
            insert.run(entityId, message.triggerKey || null, message.content, now, now);
        }
    }

    replaceScopes(entityId, channelIds, now) {
        db.prepare("DELETE FROM NarrativeEntityScopesV2 WHERE entity_id = ?").run(entityId);
        const insert = db.prepare(`
            INSERT INTO NarrativeEntityScopesV2 (entity_id, channel_id, created_at)
            VALUES (?, ?, ?)
        `);
        for (const channelId of channelIds || []) insert.run(entityId, channelId, now);
    }

    hydrate(row) {
        return {
            ...row,
            is_enabled: Number(row.is_enabled) === 1,
            triggers: db.prepare(`
                SELECT trigger_key FROM NarrativeEntityTriggersV2
                WHERE entity_id = ? ORDER BY trigger_key ASC
            `).all(row.id).map(trigger => trigger.trigger_key),
            messages: db.prepare(`
                SELECT id, trigger_key, content, is_enabled
                FROM NarrativeEntityMessagesV2 WHERE entity_id = ? ORDER BY id ASC
            `).all(row.id),
            scopes: db.prepare(`
                SELECT channel_id FROM NarrativeEntityScopesV2
                WHERE entity_id = ? ORDER BY channel_id ASC
            `).all(row.id).map(scope => scope.channel_id)
        };
    }
}

module.exports = new NarrativeEntityRepository();
