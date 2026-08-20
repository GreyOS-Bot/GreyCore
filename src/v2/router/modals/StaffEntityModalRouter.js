const policy = require("../../core/policies/StaffPermissionPolicy");
const manager = require("../../managers/NarrativeEntityV2Manager");
const eventManager = require("../../managers/NarrativeEntityEventManager");
const page = require("../../pages/staff/StaffEntitiesPage");
const { replyError } = require("../../core/services/InteractionResponseService");

module.exports = async interaction => {
    if (!interaction.isModalSubmit?.() || !interaction.customId?.startsWith("v2_staff_entities_")) return false;
    if (!policy.canAccess(interaction, "entities", { write: true })) {
        await replyError(interaction, "Tu ne peux pas modifier les Entités.");
        return true;
    }
    if (interaction.customId === "v2_staff_entities_broadcast_submit") {
        const { deferPrivate, editOrReplyError } = require("../../core/services/InteractionResponseService");
        const drafts = require("../../services/entities/NarrativeEntityBroadcastDraftService");
        const draft = drafts.get(interaction.guildId, interaction.user.id);
        const content = interaction.fields.getTextInputValue("content").trim();
        const threadName = interaction.fields.getTextInputValue("thread_name").trim()
            || "Message d’une Entité";
        if (!draft.entityIds.length || !draft.channelIds.length || !content) {
            await replyError(interaction, "Cette diffusion a expiré ou son message est vide.");
            return true;
        }

        await deferPrivate(interaction);
        const entityService = require("../../services/entities/NarrativeEntityService");
        const results = [];
        for (const channelId of draft.channelIds) {
            let channel;
            try {
                channel = await interaction.guild.channels.fetch(channelId);
            } catch (error) {
                results.push({ channelId, error });
                continue;
            }
            for (const entityId of draft.entityIds) {
                try {
                    const isForum = channel?.type === require("discord.js").ChannelType.GuildForum;
                    const sent = await entityService.sendEntity({
                        channel,
                        entityId,
                        content,
                        threadName: isForum ? threadName : null
                    });
                    results.push({ channelId, entityId, sent: Boolean(sent) });
                } catch (error) {
                    results.push({ channelId, entityId, error });
                }
            }
        }
        drafts.clear(interaction.guildId, interaction.user.id);
        const sentCount = results.filter(result => result.sent).length;
        const failedCount = results.filter(result => !result.sent).length;
        if (!sentCount) {
            await editOrReplyError(interaction, "Aucun message n’a pu être envoyé. Vérifiez les permissions des salons et forums choisis.");
            return true;
        }
        await interaction.editReply({
            content: [
                `✅ **${sentCount} message(s) d’Entité envoyé(s).**`,
                failedCount ? `⚠️ ${failedCount} envoi(s) impossible(s).` : "Toutes les destinations ont été traitées."
            ].join("\n")
        });
        return true;
    }
    if (interaction.customId.startsWith("v2_staff_entities_event_create_submit:")) {
        const entityId = interaction.customId.slice("v2_staff_entities_event_create_submit:".length);
        try {
            const event = eventManager.create({
                guildId: interaction.guildId, entityId, createdBy: interaction.user.id,
                name: interaction.fields.getTextInputValue("name"),
                calendarRule: interaction.fields.getTextInputValue("calendar"),
                weekdayRule: interaction.fields.getTextInputValue("weekdays"),
                timeRule: interaction.fields.getTextInputValue("time"),
                timezone: interaction.fields.getTextInputValue("timezone")
            });
            await interaction.update(page.buildEventDetail(interaction, event.id));
        } catch (error) { await replyError(interaction, error); }
        return true;
    }
    if (interaction.customId.startsWith("v2_staff_entities_expressions_submit:")) {
        const entityId = interaction.customId.slice(
            "v2_staff_entities_expressions_submit:".length
        );
        try {
            manager.setExpressions(
                interaction.guildId,
                entityId,
                interaction.fields.getTextInputValue("expressions")
            );
            await interaction.update(page.buildDetail(interaction, entityId));
        } catch (error) { await replyError(interaction, error); }
        return true;
    }
    const uploads = interaction.fields.getUploadedFiles("avatar", false);
    const attachment = uploads?.size
        ? Array.from(uploads.values())[0]
        : null;
    if (
        attachment
        && !require("../../services/outfits/OutfitImageStorageService")
            .isImage(attachment)
    ) {
        await replyError(interaction, "Le fichier de l’avatar doit être une image.");
        return true;
    }

    const entityId = interaction.customId.startsWith("v2_staff_entities_edit_submit:")
        ? interaction.customId.slice("v2_staff_entities_edit_submit:".length)
        : null;
    const currentEntity = entityId
        ? manager.getById(interaction.guildId, entityId)
        : null;
    const values = {
        guildId: interaction.guildId,
        createdBy: interaction.user.id,
        name: interaction.fields.getTextInputValue("name"),
        avatarUrl: attachment?.url || currentEntity?.avatar_url || null,
        color: interaction.fields.getTextInputValue("color"),
        description: interaction.fields.getTextInputValue("description"),
        messagesText: interaction.fields.getTextInputValue("messages")
    };
    try {
        let entity;
        if (interaction.customId === "v2_staff_entities_create_submit") {
            entity = manager.create(values);
        } else if (interaction.customId.startsWith("v2_staff_entities_edit_submit:")) {
            entity = manager.update({
                ...values,
                entityId
            });
        } else return false;
        await interaction.update(page.buildDetail(interaction, entity.id));
    } catch (error) { await replyError(interaction, error); }
    return true;
};
