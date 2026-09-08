const types=require("../repositories/RelationshipTypeRepository");
const repo=require("../repositories/InstallationRelationshipRepository");
const family=require("../services/relationships/FamilyTreeService");

function text(v){return String(v||"").trim()||null;}
function date(v){if(!v)return null;const n=String(v).trim(),d=new Date(`${n}T00:00:00.000Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(n)||Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==n)throw new Error("La date de début de la relation est invalide.");return n;}
function id(v,m){const n=String(v||"").trim();if(!n)throw new Error(m);return n;}
function pair(data,write=true){
 let a=data.installationAId||data.requesterInstallationId?repo.getInstallation(data.installationAId||data.requesterInstallationId):null;
 let b=data.installationBId||data.targetInstallationId?repo.getInstallation(data.installationBId||data.targetInstallationId):null;
 if(!a||!b){const forcedContext=data.contextId||a?.context_id||b?.context_id||null;const ac=a?[a]:repo.getCandidates(data.guildId,data.continuityAId||data.requesterContinuityId,forcedContext),bc=b?[b]:repo.getCandidates(data.guildId,data.continuityBId||data.targetContinuityId,forcedContext),p=[];for(const x of ac)for(const y of bc)if(x.context_id===y.context_id)p.push([x,y]);if(p.length!==1)throw new Error("Les Installations ne déterminent pas un Context unique.");[a,b]=p[0];}
 if(a.id===b.id||a.character_id===b.character_id||String(a.guild_id)!==String(b.guild_id)||a.context_id!==b.context_id||String(a.guild_id)!==String(data.guildId))throw new Error("Les Installations doivent appartenir à des personnages distincts dans la même Guild et le même Context.");
 if(data.contextId&&a.context_id!==data.contextId)throw new Error("Context de relation invalide.");
 if(write&&(!a.context_is_active||!b.context_is_active))throw new Error("Ce Context est inactif.");
 return{a,b,guildId:String(a.guild_id),contextId:a.context_id};
}
function type(guildId,typeId){const t=types.getById(guildId,typeId);if(!t)throw new Error("Type de relation introuvable sur ce serveur.");return t;}
function scope(row,s={}){if(!row)throw new Error("Relation introuvable.");if(s.guildId&&String(row.guild_id)!==String(s.guildId)||s.contextId&&row.context_id!==s.contextId)throw new Error("Relation introuvable dans ce Context.");return row;}
function display(r,c){const a=String(r.continuity_a_id)===String(c);return{...r,otherCharacterId:a?r.character_b_id:r.character_a_id,otherContinuityId:a?r.continuity_b_id:r.continuity_a_id,otherCharacterName:a?r.character_b_name:r.character_a_name,displayLabel:a?r.label_a_to_b:r.label_b_to_a};}

const manager={
 getTypes:g=>types.getByGuild(g),getTypeById:(g,t)=>types.getById(g,t),getById:repo.getById,getRequestById:repo.getRequestById,
 getLegacyRelationships:repo.getLegacyRelationships,getLegacyRequests:repo.getLegacyRequests,
 getForContinuity(){return[];},getDisplayRelationships(){return[];},
 getForInstallationInContext(i,g,c){const x=repo.getInstallation(i);if(!x||String(x.guild_id)!==String(g)||x.context_id!==c)throw new Error("Installation introuvable dans ce Context.");return repo.getForInstallation(i,c);},
 getForContext:repo.getForContext,
 getDisplayRelationshipsForInstallation(i,g,c){const x=repo.getInstallation(i);return this.getForInstallationInContext(i,g,c).map(r=>display(r,x.continuity_id));},
 getFamilyTree(i,g,c){const x=repo.getInstallation(i);if(!x)return[];return family.buildNetwork({continuityId:x.continuity_id,directRelationships:this.getDisplayRelationshipsForInstallation(i,g,c),allRelationships:repo.getForContext(g,c)});},
 hasActiveRelationship(d){const p=pair(d,false);return repo.findActive(p.a.id,p.b.id,d.relationshipTypeId,p.contextId);},
 hasPendingRequest(d){const p=pair(d,false);return repo.findPending(p.a.id,p.b.id,d.relationshipTypeId,p.contextId);},
 create(d){const p=pair(d);type(p.guildId,d.relationshipTypeId);if(repo.findActive(p.a.id,p.b.id,d.relationshipTypeId,p.contextId))throw new Error("Cette relation existe déjà.");const now=new Date().toISOString();return repo.insert({guildId:p.guildId,contextId:p.contextId,installationAId:p.a.id,installationBId:p.b.id,relationshipTypeId:d.relationshipTypeId,note:text(d.note),startedAt:date(d.startedAt),createdBy:id(d.createdBy,"Le créateur est obligatoire."),createdAt:now,updatedAt:now});},
 createRequest(d){const p=pair(d);type(p.guildId,d.relationshipTypeId);const by=id(d.requestedBy,"Le propriétaire demandeur est obligatoire."),target=id(d.targetOwnerId,"Le propriétaire ciblé est obligatoire.");if(String(p.a.owner_discord_user_id)!==by||String(p.b.owner_discord_user_id)!==target)throw new Error("Les propriétaires des Installations sont incohérents.");if(repo.findActive(p.a.id,p.b.id,d.relationshipTypeId,p.contextId))throw new Error("Cette relation existe déjà.");if(repo.findPending(p.a.id,p.b.id,d.relationshipTypeId,p.contextId))throw new Error("Une demande identique est déjà en attente.");return repo.insertRequest({guildId:p.guildId,contextId:p.contextId,requesterInstallationId:p.a.id,targetInstallationId:p.b.id,relationshipTypeId:d.relationshipTypeId,requestedBy:by,targetOwnerId:target,note:text(d.note),startedAt:date(d.startedAt),createdAt:new Date().toISOString()});},
 requirePendingRequest(i,s={}){const r=repo.getRequestById(i);if(!r||s.guildId&&String(r.guild_id)!==String(s.guildId)||s.contextId&&r.context_id!==s.contextId)throw new Error("Demande introuvable dans ce Context.");if(r.status!=="pending")throw new Error("Cette demande a déjà été traitée.");return r;},
 requireOwner(r,by,action){if(String(r.target_owner_id)!==String(by)||String(r.current_target_owner_id)!==String(by))throw new Error(`Seul le propriétaire du personnage peut ${action} cette demande.`);},
 acceptRequest(i,by,s={}){return repo.runInTransaction(()=>{const r=this.requirePendingRequest(i,s);this.requireOwner(r,by,"accepter");const p=pair({guildId:r.guild_id,contextId:r.context_id,installationAId:r.requester_installation_id,installationBId:r.target_installation_id});if(repo.findActive(p.a.id,p.b.id,r.relationship_type_id,p.contextId))throw new Error("Cette relation existe déjà.");const relationship=this.create({guildId:p.guildId,contextId:p.contextId,installationAId:p.a.id,installationBId:p.b.id,relationshipTypeId:r.relationship_type_id,note:r.note,startedAt:r.started_at,createdBy:r.requested_by});return{request:repo.respondRequest(i,"accepted",by,new Date().toISOString()),relationship};});},
 rejectRequest(i,by,s={}){return repo.runInTransaction(()=>{const r=this.requirePendingRequest(i,s);this.requireOwner(r,by,"refuser");return repo.respondRequest(i,"rejected",by,new Date().toISOString());});},
 cancelPendingRequest(i,by,s={}){const r=this.requirePendingRequest(i,s);if(by&&String(r.requested_by)!==String(by))throw new Error("Seul le demandeur peut annuler cette demande.");repo.deletePending(i);return r;},
 update(i,d,s={}){scope(repo.getById(i),s);return repo.update(i,{note:text(d.note),startedAt:date(d.startedAt),updatedAt:new Date().toISOString()});},
 end(i,s={}){const r=scope(repo.getById(i),s);if(r.ended_at)throw new Error("Cette relation est déjà terminée.");return repo.end(i,new Date().toISOString());},
 delete(i,s={}){const r=scope(repo.getById(i),s);repo.delete(i);return r;},toDisplayRelationship:display
};
module.exports=manager;
