const service=require("../../services/greyfate/GreyFateIntegrationService");
const {deferPrivate,replyPrivate}=require("../../core/services/InteractionResponseService");

module.exports=async interaction=>{
 if(!interaction.isModalSubmit?.()||!interaction.customId?.startsWith("greyfate_quest_submit:"))return false;
 const [,duoId,step,kind]=interaction.customId.split(":");
 const duo=service.duo(duoId);
 if(!duo||duo.guild_id!==interaction.guildId||duo.thread_id!==interaction.channelId)throw new Error("Cette proposition ne correspond pas à cette scène.");
 if(![duo.male_user_id,duo.female_user_id].includes(interaction.user.id))throw new Error("Seuls les membres du duo peuvent répondre.");
 const answer=kind==="FINAL"?[`QUI : ${interaction.fields.getTextInputValue("who")}`,`OÙ : ${interaction.fields.getTextInputValue("where")}`,`À EMPÊCHER : ${interaction.fields.getTextInputValue("what")}`].join("\n"):interaction.fields.getTextInputValue("answer");
 await deferPrivate(interaction);
 try{await service.submitQuestAnswer(duo,interaction.user.id,Number(step),answer,interaction.id);await replyPrivate(interaction,"🧵 Votre proposition a été envoyée au staff. Weaver attend sa décision.");}
 catch(error){await replyPrivate(interaction,`❌ ${error.message}`).catch(()=>null);}
 return true;
};
