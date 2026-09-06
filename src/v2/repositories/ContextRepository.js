class ContextRepository {
    constructor(db = require('../../database/database')) { this.db = db; }
    transaction(action) { return this.db.transaction(action).immediate(); }
    guildExists(guildId) {
        return Boolean(this.db.prepare('SELECT id FROM Guilds WHERE id = ?').get(guildId));
    }
    getById(guildId, id) {
        return this.db.prepare('SELECT * FROM Contexts WHERE guild_id = ? AND id = ?').get(guildId, id) || null;
    }
    getByKey(guildId, key) {
        return this.db.prepare('SELECT * FROM Contexts WHERE guild_id = ? AND key = ?').get(guildId, key) || null;
    }
    listByGuild(guildId) {
        return this.db.prepare('SELECT * FROM Contexts WHERE guild_id = ? ORDER BY is_default DESC, key').all(guildId);
    }
    getDefault(guildId) {
        return this.db.prepare('SELECT * FROM Contexts WHERE guild_id = ? AND is_default = 1').get(guildId) || null;
    }
    create(row) {
        this.db.prepare(`INSERT INTO Contexts
            (id, guild_id, key, name, description, is_active, is_default,
             parent_context_id, created_by, created_at, updated_at)
            VALUES (@id, @guild_id, @key, @name, @description, @is_active, @is_default,
                    @parent_context_id, @created_by, @created_at, @updated_at)`).run(row);
        return this.getById(row.guild_id, row.id);
    }
    update(guildId, id, row) {
        this.db.prepare(`UPDATE Contexts SET key = @key, name = @name,
            description = @description, parent_context_id = @parent_context_id,
            is_active = @is_active, updated_at = @updated_at
            WHERE guild_id = @guildId AND id = @id`).run({ ...row, guildId, id });
        return this.getById(guildId, id);
    }
    setDefault(guildId, id, timestamp) {
        return this.transaction(() => {
            const row = this.getById(guildId, id);
            if (!row || !row.is_active) throw new Error('Contexte actif introuvable.');
            this.db.prepare('UPDATE Contexts SET is_default = 0, updated_at = ? WHERE guild_id = ? AND is_default = 1').run(timestamp, guildId);
            this.db.prepare('UPDATE Contexts SET is_default = 1, updated_at = ? WHERE guild_id = ? AND id = ?').run(timestamp, guildId, id);
            return this.getById(guildId, id);
        });
    }
}
module.exports = ContextRepository;
