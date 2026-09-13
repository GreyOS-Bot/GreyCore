const {randomUUID}=require("node:crypto");
const repo=require("../repositories/NarrativeEntityInstanceRepository");
const definitions=require("./NarrativeEntityV2Manager");
class Manager{
 requireContext(guildId,contextId,{write=false}={}){if(!contextId)throw new Error("Un Context explicite est obligatoire.");const c=repo.context(guildId,contextId);if(!c)throw new Error("Context introuvable sur ce serveur.");if(write&&Number(c.is_active)!==1)throw new Error("Ce Context est inactif.");return c;}
 list(guildId,contextId){this.requireContext(guildId,contextId);return repo.list(guildId,contextId);}
 enabled(guildId,contextId){this.requireContext(guildId,contextId);return repo.enabled(guildId,contextId);}
 get(guildId,contextId,id){this.requireContext(guildId,contextId);return repo.get(guildId,contextId,id);}
 require(guildId,contextId,id,{write=false}={}){this.requireContext(guildId,contextId,{write});const row=repo.get(guildId,contextId,id);if(!row)throw new Error("Instance Entity introuvable dans ce Context.");return row;}
 create({guildId,contextId,definitionId,createdBy}){this.requireContext(guildId,contextId,{write:true});if(!definitions.getById(guildId,definitionId))throw new Error("Définition Entity introuvable sur ce serveur.");const now=new Date().toISOString();return repo.create({id:`entityinst_${randomUUID()}`,definitionId,guildId,contextId,createdBy:createdBy||null,now});}
 toggle(guildId,contextId,id){const row=this.require(guildId,contextId,id,{write:true});return repo.toggle(row,!row.is_active,new Date().toISOString());}
 setScopes(guildId,contextId,id,channelIds){const row=this.require(guildId,contextId,id,{write:true});const ids=[...new Set((channelIds||[]).map(String))].slice(0,25);for(const channelId of ids){const contexts=repo.channelContext(guildId,channelId);if(contexts.length!==1||String(contexts[0].context_id)!==String(contextId))throw new Error("Ce salon n’appartient pas au Context de l’instance Entity.");}return repo.replaceScopes(row,ids,new Date().toISOString());}
 requireDestination(guildId,contextId,id,channelId,parentId=null){const row=this.require(guildId,contextId,id,{write:true});const scoped=[String(channelId),parentId?String(parentId):null].filter(Boolean).find(candidate=>row.scopes.includes(candidate));if(!scoped)throw new Error("Destination hors du Context de l’instance Entity.");const contexts=repo.channelContext(guildId,scoped);if(contexts.length!==1||String(contexts[0].context_id)!==String(contextId))throw new Error("La destination n’appartient plus au Context de l’instance Entity.");return row;}
 claimWelcome(guildId,contextId,id,channelId){const row=this.require(guildId,contextId,id,{write:true});this.setScopes(guildId,contextId,id,[...row.scopes,channelId]);return repo.claimWelcome(row,String(channelId),new Date().toISOString());}
 releaseWelcome(guildId,contextId,id,channelId){this.require(guildId,contextId,id);repo.releaseWelcome(id,String(channelId));}
 byDefinition(guildId,contextId,definitionId,{active=false}={}){this.requireContext(guildId,contextId);const row=repo.byDefinition(guildId,contextId,definitionId);return row&&(!active||row.is_active)?row:null;}
}
module.exports=new Manager();
