const runtime = require("../repositories/InstallationStateRepository");

class InstallationStateV2Manager {
    getActiveStates(id){return runtime.getActive(id);}
    getHistory(id){return runtime.getHistory(id);}
    getById(id){return runtime.getById(id);}
    hasActiveState(id,typeId){return runtime.findActive(id,typeId);}
    requireScope(installationId,guildId,contextId,actorId,{active=true}={}){const s=runtime.getScope(installationId);if(!s||String(s.guild_id)!==String(guildId)||String(s.context_id)!==String(contextId))throw new Error("Installation introuvable dans ce Context.");if(String(s.owner_id)!==String(actorId))throw new Error("Tu ne peux pas gérer les états de ce personnage.");if(s.status!=="approved"||Number(s.character_archived)===1)throw new Error("Cette installation n’est pas jouable.");if(active&&Number(s.is_active)!==1)throw new Error("Ce Context est inactif.");return s;}
    requireScopedState(id,data,options){const state=this.requireState(id);this.requireScope(data.installationId,data.guildId,data.contextId,data.actorId,options);if(Number(state.installation_id)!==Number(data.installationId)||String(state.guild_id)!==String(data.guildId)||String(state.context_id)!==String(data.contextId))throw new Error("État introuvable dans ce Context.");return state;}
    create(data){const s=this.requireScope(data.installationId,data.guildId,data.contextId,data.createdBy);if(!runtime.getStateType(data.stateTypeId,s.guild_id))throw new Error("Ce type d’état n’appartient pas à ce serveur.");const now=new Date().toISOString();try{return runtime.insert({guildId:String(s.guild_id),contextId:s.context_id,installationId:s.id,stateTypeId:data.stateTypeId,note:this.normalizeText(data.note),startedAt:this.normalizeDate(data.startedAt,now),createdBy:String(data.createdBy),createdAt:now,updatedAt:now});}catch(error){if(String(error.message).includes("UNIQUE"))throw new Error("Cette installation possède déjà cet état.");throw error;}}
    end(id,data){const s=this.requireScopedState(id,data,{active:false});if(s.ended_at)throw new Error("Cet état est déjà terminé.");return runtime.end(id,new Date().toISOString());}
    updateState(id,data){const s=this.requireScopedState(id,data,{active:true});return runtime.update(id,{note:this.normalizeText(data.note),startedAt:this.normalizeDate(data.startedAt,s.started_at),updatedAt:new Date().toISOString()});}
    delete(id,data){const s=this.requireScopedState(id,data,{active:false});runtime.delete(id);return s;}
    deleteState(id,data){return this.delete(id,data);}
    requireState(id){const s=this.getById(id);if(!s)throw new Error("État introuvable.");return s;}
    getLegacyUnmigrated(){return runtime.getLegacyUnmigrated();}
    normalizeText(v){return String(v||"").trim()||null;}
    normalizeDate(v,f){if(!v)return f;const n=String(v).trim();if(/^\d{4}-\d{2}-\d{2}$/.test(n)){const d=new Date(`${n}T00:00:00.000Z`);if(!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===n)return n;}throw new Error("La date de début de l’état est invalide.");}
}
module.exports=new InstallationStateV2Manager();
