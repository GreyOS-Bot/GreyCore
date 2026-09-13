const test=require("node:test");const assert=require("node:assert/strict");const {createIsolatedDatabase}=require("./helpers/isolatedDatabase");
function reload(p){delete require.cache[require.resolve(p)];return require(p);}function seed(db){db.prepare("INSERT INTO Guilds(id,name,created_at) VALUES('g1','G1','n'),('g2','G2','n')").run();const R=reload("../src/v2/repositories/ContextRepository"),S=reload("../src/v2/services/contexts/ContextService"),s=new S(new R(db));return {a:s.create({guildId:'g1',key:'a',name:'A'}),b:s.create({guildId:'g1',key:'b',name:'B'}),x:s.create({guildId:'g2',key:'x',name:'X'})};}
test("3I sépare définition Entity et instances Context sans héritage ni IDs forgés",()=>{const h=createIsolatedDatabase({initializeSchema:true});try{const db=h.database,c=seed(db),defs=reload("../src/v2/managers/NarrativeEntityV2Manager"),instances=reload("../src/v2/managers/NarrativeEntityInstanceV2Manager");const d=defs.create({guildId:'g1',createdBy:'u',name:'Oracle',messagesText:'Bonjour'}),ia=instances.create({guildId:'g1',contextId:c.a.id,definitionId:d.id,createdBy:'u'}),ib=instances.create({guildId:'g1',contextId:c.b.id,definitionId:d.id,createdBy:'u'});assert.equal(ia.entity_definition_id,ib.entity_definition_id);assert.notEqual(ia.id,ib.id);assert.equal(instances.list('g1',c.a.id).length,1);assert.equal(instances.list('g1',c.b.id).length,1);assert.throws(()=>instances.create({guildId:'g1',contextId:c.a.id,definitionId:d.id}),/UNIQUE/);assert.throws(()=>instances.require('g1',c.a.id,ib.id),/introuvable/);assert.throws(()=>db.prepare("UPDATE NarrativeEntityInstancesV2 SET context_id=? WHERE id=?").run(c.b.id,ia.id),/immutable/);}finally{h.cleanup();}});
test("3I conserve ProxyMessages legacy et impose Installation plus Context aux nouveaux V2",()=>{const h=createIsolatedDatabase({initializeSchema:true});try{const db=h.database,c=seed(db);db.prepare("INSERT INTO UsersV2(id,discord_user_id,created_at,updated_at) VALUES(1,'u','n','n')").run();db.prepare("INSERT INTO CharactersV2(id,owner_user_id,proxy_name,character_type,created_at,updated_at) VALUES('ch',1,'P','personnage_joue','n','n')").run();db.prepare("INSERT INTO CharacterContinuitiesV2(id,character_id,name,created_at,updated_at) VALUES('co','ch','C','n','n')").run();const i=Number(db.prepare("INSERT INTO CharacterGuildInstallationsV2(character_id,continuity_id,guild_id,status,visibility,proxy_enabled,installed_at,updated_at,context_id) VALUES('ch','co','g1','approved','public',1,'n','n',?)").run(c.a.id).lastInsertRowid),m=reload("../src/managers/ProxyMessageManager");const data={discordMessageId:'d',webhookMessageId:'w',webhookId:'h',channelId:'chan',guildId:'g1',authorId:'u',characterId:'ch',installationId:i,contextId:c.a.id};assert.equal(m.save(data),true);assert.equal(m.get('d').context_id,c.a.id);assert.throws(()=>m.save({...data,discordMessageId:'x',contextId:c.b.id}),/hors du Context/);assert.throws(()=>m.requireScoped(m.get('d'),{guildId:'g1',contextId:c.b.id,installationId:i,actorId:'u'}),/introuvable/);db.prepare("INSERT INTO ProxyMessages(discord_message_id,webhook_message_id,webhook_id,channel_id,guild_id,author_id,character_id,character_version,created_at) VALUES('old','ow','oh','oc','g1','u','ch','v2','n')").run();assert.equal(m.get('old').context_id,null);}finally{h.cleanup();}});
test("3I isole les Public Places par Context et refuse les mutations inactives",()=>{const h=createIsolatedDatabase({initializeSchema:true});try{const db=h.database,c=seed(db),r=reload("../src/v2/repositories/PublicPlaceRepository"),s=reload("../src/v2/services/publicPlaces/PublicPlaceForumService");r.upsertMany('g1',c.a.id,'f',[{id:'p',name:'Place A'}]);r.upsertMany('g1',c.b.id,'f',[{id:'p',name:'Place B'}]);assert.equal(r.getByForum('g1',c.a.id,'f')[0].name,'Place A');assert.equal(r.getByForum('g1',c.b.id,'f')[0].name,'Place B');assert.equal(r.getByForum('g2',c.x.id,'f').length,0);assert.throws(()=>s.categorize('g1',c.b.id,'missing','bar_club'),/introuvable/);assert.throws(()=>s.categorize('g2',c.x.id,'p','bar_club'),/introuvable/);db.prepare("UPDATE Contexts SET is_active=0,is_default=0 WHERE id=?").run(c.a.id);assert.throws(()=>s.categorize('g1',c.a.id,'p','bar_club'),/inactif/);}finally{h.cleanup();}});
test("3I transmet un Context GreyFate et une clé stable par soumission",async()=>{const h=createIsolatedDatabase({initializeSchema:true});try{const db=h.database,c=seed(db),service=reload("../src/v2/services/greyfate/GreyFateIntegrationService");service.initializeSchema();db.prepare("INSERT INTO GreyFateEvents(event_id,guild_id,status,payload,received_at,updated_at) VALUES('e','g1','ACTIVE','{}','n','n')").run();db.prepare("INSERT INTO GreyFateDuos(duo_id,event_id,guild_id,context_id,thread_id,male_user_id,female_user_id,updated_at) VALUES('duo','e','g1',?,'thread','u','v','n')").run(c.a.id);db.prepare("INSERT INTO GreyFateDuoQuestSteps(duo_id,guild_id,context_id,thread_id,step_number,updated_at) VALUES('duo','g1',?,'thread',2,'n')").run(c.a.id);const sent=[];service.sendToFate=async p=>{sent.push(p);return {ok:true};};const duo=service.duo('duo');await service.questAnswer(duo,'u','réponse',2,'interaction-1');await service.questAnswer(duo,'u','réponse',2,'interaction-1');assert.equal(sent[0].contextId,c.a.id);assert.equal(sent[0].operationKey,sent[1].operationKey);await assert.rejects(()=>service.questAnswer(duo,'u','réponse',1,'interaction-old'),/plus active/);await assert.rejects(()=>service.questAnswer(duo,'x','réponse',2,'interaction-x'),/réservée/);assert.throws(()=>service.assertDuoContext(duo,{guildId:'g1',contextId:c.b.id}),/contexte|Context/i);}finally{h.cleanup();}});

test("3I refuse les scopes et événements Entity forgés entre Contexts",()=>{
  const h=createIsolatedDatabase({initializeSchema:true});
  try{
    const db=h.database,c=seed(db),definitions=reload("../src/v2/managers/NarrativeEntityV2Manager"),instances=reload("../src/v2/managers/NarrativeEntityInstanceV2Manager"),events=reload("../src/v2/managers/ContextNarrativeEntityEventManager");
    for(const [id,contextId,channelId] of [['sa',c.a.id,'ca'],['sb',c.b.id,'cb']]){
      db.prepare("INSERT INTO ScenesV2(id,guild_id,context_id,title,status,started_at,created_at,updated_at) VALUES(?, 'g1', ?, ?, 'active', 'n', 'n', 'n')").run(id,contextId,id);
      db.prepare("INSERT INTO SceneChannelsV2(scene_id,guild_id,channel_id,linked_at) VALUES(?, 'g1', ?, 'n')").run(id,channelId);
    }
    const definition=definitions.create({guildId:'g1',createdBy:'u',name:'Oracle',messagesText:'Bonjour'});
    const ia=instances.create({guildId:'g1',contextId:c.a.id,definitionId:definition.id,createdBy:'u'});
    const ib=instances.create({guildId:'g1',contextId:c.b.id,definitionId:definition.id,createdBy:'u'});
    instances.setScopes('g1',c.a.id,ia.id,['ca']);
    assert.throws(()=>instances.setScopes('g1',c.a.id,ia.id,['cb']),/n’appartient pas/);
    assert.equal(instances.claimWelcome('g1',c.a.id,ia.id,'ca'),true);
    assert.equal(instances.claimWelcome('g1',c.a.id,ia.id,'ca'),false);
    assert.equal(instances.claimWelcome('g1',c.b.id,ib.id,'cb'),true);
    const event=events.create({guildId:'g1',contextId:c.a.id,instanceId:ia.id,name:'A',calendarRule:'toujours',weekdayRule:'tous',timeRule:'21:00',timezone:'Europe/Paris',scopeIds:['ca']});
    assert.throws(()=>events.getByInstance('g1',c.a.id,ib.id),/introuvable/);
    assert.equal(events.getById('g1',c.b.id,event.id),null);
    assert.throws(()=>events.setScopes('g1',c.b.id,event.id,['cb']),/introuvable/);
    assert.throws(()=>events.setScopes('g1',c.a.id,event.id,['cb']),/n’appartient pas/);
  }finally{h.cleanup();}
});

test("3I migre les anciens runtimes uniquement avec une preuve contextuelle unique",()=>{
  const h=createIsolatedDatabase({initializeSchema:true});
  try{
    const db=h.database,c=seed(db);
    db.prepare("INSERT INTO Guilds(id,name,created_at) VALUES('g3','G3','n')").run();
    const ContextRepository=reload("../src/v2/repositories/ContextRepository"),ContextService=reload("../src/v2/services/contexts/ContextService");
    const only=new ContextService(new ContextRepository(db)).create({guildId:'g3',key:'only',name:'Only'});
    for(const [id,contextId,channelId] of [['sa',c.a.id,'ca'],['sb',c.b.id,'cb']]){
      db.prepare("INSERT INTO ScenesV2(id,guild_id,context_id,title,status,started_at,created_at,updated_at) VALUES(?, 'g1', ?, ?, 'active', 'n', 'n', 'n')").run(id,contextId,id);
      db.prepare("INSERT INTO SceneChannelsV2(scene_id,guild_id,channel_id,linked_at) VALUES(?, 'g1', ?, 'n')").run(id,channelId);
    }
    const insertDefinition=db.prepare("INSERT INTO NarrativeEntitiesV2(id,guild_id,name,is_enabled,created_at,updated_at) VALUES(?, 'g1', ?, 1, 'n', 'n')");
    insertDefinition.run('det','Deterministic');insertDefinition.run('amb','Ambiguous');
    db.prepare("INSERT INTO NarrativeEntityScopesV2(entity_id,channel_id,created_at) VALUES('det','ca','n'),('amb','ca','n'),('amb','cb','n')").run();
    db.prepare("INSERT INTO NarrativeEntityChannelWelcomesV2(entity_id,channel_id,welcomed_at) VALUES('det','ca','n')").run();
    db.prepare("INSERT INTO NarrativeEntityEventsV2(id,guild_id,entity_id,name,time_rule,created_at,updated_at) VALUES('ev','g1','det','Event','21:00','n','n')").run();
    db.prepare("INSERT INTO NarrativeEntityEventScopesV2(event_id,channel_id,created_at) VALUES('ev','ca','n')").run();
    db.prepare("INSERT INTO NarrativeEntityEventRunsV2(event_id,run_key,channel_id,status,created_at) VALUES('ev','rk','ca','sent','n')").run();
    reload("../src/v2/repositories/EntityContextSchema")(db);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM NarrativeEntityInstancesV2 WHERE legacy_entity_id='det'").get().n,1);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM NarrativeEntityInstancesV2 WHERE legacy_entity_id='amb'").get().n,0);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM NarrativeEntityInstanceWelcomesV2").get().n,1);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM ContextNarrativeEntityEventsV2 WHERE legacy_event_id='ev'").get().n,1);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM ContextNarrativeEntityEventRunsV2").get().n,1);
    db.prepare("INSERT INTO GuildPublicPlacesV2(guild_id,forum_id,channel_id,name,is_archived,updated_at) VALUES('g3','f3','p3','Only place',0,'n'),('g1','f1','p1','Ambiguous place',0,'n')").run();
    reload("../src/v2/repositories/ContextPublicPlaceSchema")(db);
    assert.equal(db.prepare("SELECT context_id FROM ContextPublicPlacesV2 WHERE legacy_guild_id='g3'").get().context_id,only.id);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM ContextPublicPlacesV2 WHERE legacy_guild_id='g1'").get().n,0);
    reload("../src/v2/repositories/EntityContextSchema")(db);
    reload("../src/v2/repositories/ContextPublicPlaceSchema")(db);
    assert.equal(db.pragma('integrity_check',{simple:true}),'ok');
  }finally{h.cleanup();}
});
