const runtime=require("../repositories/InstallationOutfitRepository");

class InstallationOutfitV2Manager {
    getById(id){return runtime.getById(id);}
    getCurrent(id){return runtime.getCurrent(id);}
    getForInstallation(id,limit=25){return runtime.getForInstallation(id,this.normalizeLimit(limit,25));}
    getForContinuity(id,limit=25){return this.getForInstallation(id,limit);}
    getHistory(id,limit=20){return runtime.getHistory(id,this.normalizeLimit(limit,20));}
    requireScope(installationId,guildId,contextId,actorId,{active=true}={}){const s=runtime.getScope(installationId);if(!s||String(s.guild_id)!==String(guildId)||String(s.context_id)!==String(contextId))throw new Error("Installation introuvable dans ce Context.");if(String(s.owner_id)!==String(actorId))throw new Error("Tu ne peux pas gérer les tenues de ce personnage.");if(s.status!=="approved"||Number(s.character_archived)===1)throw new Error("Cette installation n’est pas jouable.");if(active&&Number(s.is_active)!==1)throw new Error("Ce Context est inactif.");return s;}
    requireScopedOutfit(id,data,options){const o=this.requireOutfit(id);this.requireScope(data.installationId,data.guildId,data.contextId,data.actorId,options);if(Number(o.installation_id)!==Number(data.installationId)||String(o.guild_id)!==String(data.guildId)||String(o.context_id)!==String(data.contextId))throw new Error("Tenue introuvable dans ce Context.");return o;}
    createCurrent(data){const imageUrl=String(data.imageUrl||"").trim();if(!imageUrl)throw new Error("L’image de la tenue est obligatoire.");const s=this.requireScope(data.installationId,data.guildId,data.contextId,data.createdBy);const now=new Date().toISOString();return runtime.createCurrent({guildId:String(s.guild_id),contextId:s.context_id,installationId:s.id,imageUrl,imageData:this.normalizeImageData(data.imageData),imageFilename:this.normalizeText(data.imageFilename),imageContentType:this.normalizeText(data.imageContentType),title:this.normalizeText(data.title),description:this.normalizeText(data.description),createdAt:data.createdAt||now,updatedAt:data.updatedAt||now});}
    updateDetails(id,data){const o=this.requireScopedOutfit(id,data,{active:true});return runtime.updateDetails(id,{title:data.title===undefined?o.title:this.normalizeText(data.title),description:data.description===undefined?o.description:this.normalizeText(data.description),updatedAt:new Date().toISOString()});}
    setCurrent(id,data){const o=this.requireScopedOutfit(id,data,{active:true});return runtime.setCurrent(o,new Date().toISOString());}
    delete(id,data){const o=this.requireScopedOutfit(id,data,{active:false});runtime.delete(id);return o;}
    requireOutfit(id){const o=this.getById(id);if(!o)throw new Error("Tenue introuvable.");return o;}
    getLegacyUnmigrated(){return runtime.getLegacyUnmigrated();}
    normalizeText(v){return String(v||"").trim()||null;}
    normalizeImageData(v){if(!v)return null;if(!Buffer.isBuffer(v))throw new Error("L'image de la tenue est invalide.");return v;}
    normalizeLimit(v,f){const n=Number(v);return Number.isInteger(n)&&n>=0?Math.min(n,100):f;}
}
module.exports=new InstallationOutfitV2Manager();
