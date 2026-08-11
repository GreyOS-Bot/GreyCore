const db = require("../../database/database");

class NarrativeEntityEventRepository {
    getByGuild(guildId) {
        return db.prepare(`
            SELECT event.*, entity.name AS entity_name, entity.avatar_url,
                   entity.embed_color, entity.is_enabled AS entity_enabled
            FROM NarrativeEntityEventsV2 event
            JOIN NarrativeEntitiesV2 entity ON entity.id = event.entity_id
            WHERE event.guild_id = ?
            ORDER BY event.name COLLATE NOCASE ASC
        `).all(guildId).map(row => this.hydrate(row));
    }

    getByEntity(guildId, entityId) {
        return this.getByGuild(guildId).filter(event => event.entity_id === entityId);
    }

    getById(guildId, eventId) {
        const row = db.prepare(`
            SELECT event.*, entity.name AS entity_name, entity.avatar_url,
                   entity.embed_color, entity.is_enabled AS entity_enabled
            FROM NarrativeEntityEventsV2 event
            JOIN NarrativeEntitiesV2 entity ON entity.id = event.entity_id
            WHERE event.guild_id = ? AND event.id = ?
        `).get(guildId, eventId);
        return row ? this.hydrate(row) : null;
    }

    getEnabled() {
        return db.prepare(`
            SELECT event.*, entity.name AS entity_name, entity.avatar_url,
                   entity.embed_color, entity.is_enabled AS entity_enabled
            FROM NarrativeEntityEventsV2 event
            JOIN NarrativeEntitiesV2 entity ON entity.id = event.entity_id
            WHERE event.is_enabled = 1 AND entity.is_enabled = 1
            ORDER BY event.guild_id, event.name COLLATE NOCASE ASC
        `).all().map(row => this.hydrate(row));
    }

    create(event) {
        const run = db.transaction(() => {
            db.prepare(`
                INSERT INTO NarrativeEntityEventsV2 (
                    id, guild_id, entity_id, name, calendar_rule, weekday_rule,
                    time_rule, timezone, message_content, action_key,
                    action_payload, is_enabled, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            `).run(
                event.id, event.guildId, event.entityId, event.name,
                event.calendarRule, event.weekdayRule, event.timeRule,
                event.timezone, event.messageContent, event.actionKey,
                event.actionPayload, event.createdBy, event.now, event.now
            );
            this.replaceScopes(event.id, event.scopeIds, event.now);
        });
        run();
        return this.getById(event.guildId, event.id);
    }

    setScopes(guildId, eventId, scopeIds, now) {
        const event = this.getById(guildId, eventId);
        if (!event) return null;
        db.transaction(() => this.replaceScopes(eventId, scopeIds, now))();
        return this.getById(guildId, eventId);
    }

    setEnabled(guildId, eventId, enabled, now) {
        db.prepare(`UPDATE NarrativeEntityEventsV2 SET is_enabled = ?, updated_at = ?
            WHERE guild_id = ? AND id = ?`).run(enabled ? 1 : 0, now, guildId, eventId);
        return this.getById(guildId, eventId);
    }

    claimRun(eventId, runKey, channelId, now) {
        return db.prepare(`
            INSERT OR IGNORE INTO NarrativeEntityEventRunsV2
                (event_id, run_key, channel_id, status, created_at)
            VALUES (?, ?, ?, 'running', ?)
        `).run(eventId, runKey, channelId, now).changes > 0;
    }

    completeRun(eventId, runKey, channelId, messageId, now) {
        db.prepare(`UPDATE NarrativeEntityEventRunsV2
            SET status = 'sent', message_id = ?, error_message = NULL
            WHERE event_id = ? AND run_key = ? AND channel_id = ?
        `).run(messageId || null, eventId, runKey, channelId);
        db.prepare(`UPDATE NarrativeEntityEventsV2 SET last_run_key = ?, updated_at = ?
            WHERE id = ?`).run(runKey, now, eventId);
    }

    failRun(eventId, runKey, channelId, error, now) {
        db.prepare(`UPDATE NarrativeEntityEventRunsV2
            SET status = 'failed', error_message = ?
            WHERE event_id = ? AND run_key = ? AND channel_id = ?
        `).run(String(error || "Erreur inconnue").slice(0, 1000), eventId, runKey, channelId);
        db.prepare(`UPDATE NarrativeEntityEventsV2 SET updated_at = ? WHERE id = ?`).run(now, eventId);
    }

    delete(guildId, eventId) {
        return db.prepare("DELETE FROM NarrativeEntityEventsV2 WHERE guild_id = ? AND id = ?")
            .run(guildId, eventId).changes > 0;
    }

    replaceScopes(eventId, scopeIds, now) {
        db.prepare("DELETE FROM NarrativeEntityEventScopesV2 WHERE event_id = ?").run(eventId);
        const insert = db.prepare(`INSERT INTO NarrativeEntityEventScopesV2
            (event_id, channel_id, created_at) VALUES (?, ?, ?)`);
        for (const scopeId of scopeIds || []) insert.run(eventId, String(scopeId), now);
    }

    hydrate(row) {
        return {
            ...row,
            is_enabled: Number(row.is_enabled) === 1,
            entity_enabled: Number(row.entity_enabled) === 1,
            scopes: db.prepare(`SELECT channel_id FROM NarrativeEntityEventScopesV2
                WHERE event_id = ? ORDER BY channel_id`).all(row.id).map(item => item.channel_id)
        };
    }
}

module.exports = new NarrativeEntityEventRepository();
