function column(db, table, name) { return db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===name); }
module.exports = function initializeProxyContextMigration(db) {
    if (!column(db,"ProxyMessages","installation_id")) db.exec("ALTER TABLE ProxyMessages ADD COLUMN installation_id INTEGER");
    if (!column(db,"ProxyMessages","context_id")) db.exec("ALTER TABLE ProxyMessages ADD COLUMN context_id TEXT");
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_proxy_messages_scope ON ProxyMessages(guild_id,context_id,installation_id);
        CREATE TRIGGER IF NOT EXISTS trg_proxy_message_scope_insert BEFORE INSERT ON ProxyMessages
        WHEN (NEW.installation_id IS NULL) <> (NEW.context_id IS NULL)
          OR (NEW.installation_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM CharacterGuildInstallationsV2 i WHERE i.id=NEW.installation_id AND i.guild_id=NEW.guild_id
          AND i.context_id=NEW.context_id AND i.character_id=NEW.character_id))
        BEGIN SELECT RAISE(ABORT,'ProxyMessage scope mismatch'); END;
        DROP TRIGGER IF EXISTS trg_proxy_message_scope_immutable;
        CREATE TRIGGER trg_proxy_message_scope_immutable BEFORE UPDATE OF guild_id,character_id,installation_id,context_id,channel_id ON ProxyMessages
        WHEN OLD.installation_id IS NOT NULL OR OLD.context_id IS NOT NULL
        BEGIN SELECT RAISE(ABORT,'ProxyMessage scope is immutable'); END;
    `);
    db.prepare(`UPDATE ProxyMessages SET installation_id=(
        SELECT MIN(i.id) FROM SceneChannelsV2 sc JOIN ScenesV2 s ON s.id=sc.scene_id
        JOIN CharacterGuildInstallationsV2 i ON i.guild_id=ProxyMessages.guild_id AND i.context_id=s.context_id AND i.character_id=ProxyMessages.character_id
        WHERE sc.channel_id=ProxyMessages.channel_id AND sc.unlinked_at IS NULL
        HAVING COUNT(DISTINCT s.context_id)=1 AND COUNT(DISTINCT i.id)=1), context_id=(
        SELECT MIN(s.context_id) FROM SceneChannelsV2 sc JOIN ScenesV2 s ON s.id=sc.scene_id
        JOIN CharacterGuildInstallationsV2 i ON i.guild_id=ProxyMessages.guild_id AND i.context_id=s.context_id AND i.character_id=ProxyMessages.character_id
        WHERE sc.channel_id=ProxyMessages.channel_id AND sc.unlinked_at IS NULL
        HAVING COUNT(DISTINCT s.context_id)=1 AND COUNT(DISTINCT i.id)=1)
        WHERE character_version='v2' AND installation_id IS NULL`).run();
};
