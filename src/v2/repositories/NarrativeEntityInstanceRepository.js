const db=new Proxy({}, {get(_target,key){const current=require("../../database/database");const value=current[key];return typeof value==="function"?value.bind(current):value;}});
const SELECT=`SELECT i.*,d.name,d.avatar_url,d.embed_color,d.description,d.created_by AS definition_created_by
 FROM NarrativeEntityInstancesV2 i JOIN NarrativeEntitiesV2 d ON d.id=i.entity_definition_id`;
class Repository{
 list(guildId,contextId){return db.prepare(`${SELECT} WHERE i.guild_id=? AND i.context_id=? ORDER BY d.name COLLATE NOCASE`).all(guildId,contextId).map(r=>this.hydrate(r));}
 enabled(guildId,contextId){return this.list(guildId,contextId).filter(x=>x.is_active);}
 get(guildId,contextId,id){const r=db.prepare(`${SELECT} WHERE i.guild_id=? AND i.context_id=? AND i.id=?`).get(guildId,contextId,id);return r?this.hydrate(r):null;}
 byDefinition(guildId,contextId,definitionId){const r=db.prepare(`${SELECT} WHERE i.guild_id=? AND i.context_id=? AND i.entity_definition_id=?`).get(guildId,contextId,definitionId);return r?this.hydrate(r):null;}
 context(guildId,contextId){return db.prepare("SELECT * FROM Contexts WHERE guild_id=? AND id=?").get(guildId,contextId);}
 create(row){db.prepare(`INSERT INTO NarrativeEntityInstancesV2(id,entity_definition_id,guild_id,context_id,is_active,created_by,created_at,updated_at) VALUES(@id,@definitionId,@guildId,@contextId,1,@createdBy,@now,@now)`).run(row);return this.get(row.guildId,row.contextId,row.id);}
 toggle(row,active,now){db.prepare("UPDATE NarrativeEntityInstancesV2 SET is_active=?,updated_at=? WHERE id=?").run(active?1:0,now,row.id);return this.get(row.guild_id,row.context_id,row.id);}
 replaceScopes(row,ids,now){db.transaction(()=>{db.prepare("DELETE FROM NarrativeEntityInstanceScopesV2 WHERE instance_id=?").run(row.id);const q=db.prepare("INSERT INTO NarrativeEntityInstanceScopesV2(instance_id,guild_id,context_id,channel_id,created_at) VALUES(?,?,?,?,?)");for(const id of ids)q.run(row.id,row.guild_id,row.context_id,id,now);})();return this.get(row.guild_id,row.context_id,row.id);}
 claimWelcome(row,channelId,now){return db.prepare("INSERT OR IGNORE INTO NarrativeEntityInstanceWelcomesV2(instance_id,guild_id,context_id,channel_id,welcomed_at) VALUES(?,?,?,?,?)").run(row.id,row.guild_id,row.context_id,channelId,now).changes===1;}
 releaseWelcome(id,channelId){db.prepare("DELETE FROM NarrativeEntityInstanceWelcomesV2 WHERE instance_id=? AND channel_id=?").run(id,channelId);}
 channelContext(guildId,channelId){return db.prepare(`SELECT DISTINCT s.context_id FROM SceneChannelsV2 sc JOIN ScenesV2 s ON s.id=sc.scene_id WHERE sc.guild_id=? AND sc.channel_id=? AND sc.unlinked_at IS NULL`).all(guildId,channelId);}
 hydrate(r){const id=r.entity_definition_id;return {...r,is_active:Number(r.is_active)===1,is_enabled:Number(r.is_active)===1,
  triggers:db.prepare("SELECT trigger_key FROM NarrativeEntityTriggersV2 WHERE entity_id=? ORDER BY trigger_key").all(id).map(x=>x.trigger_key),
  messages:db.prepare("SELECT * FROM NarrativeEntityMessagesV2 WHERE entity_id=? ORDER BY id").all(id),
  expressions:db.prepare("SELECT expression,normalized_expression FROM NarrativeEntityExpressionsV2 WHERE entity_id=? ORDER BY expression COLLATE NOCASE").all(id),
  scopes:db.prepare("SELECT channel_id FROM NarrativeEntityInstanceScopesV2 WHERE instance_id=? ORDER BY channel_id").all(r.id).map(x=>x.channel_id)};}
}
module.exports=new Repository();
