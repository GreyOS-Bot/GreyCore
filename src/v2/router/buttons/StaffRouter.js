module.exports = async interaction => {
    if (!interaction.isButton?.()) return false;
    if (!interaction.customId) return false;

    if (interaction.customId === "v2_staff_permissions_toggle_validation") {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const manager = require("../../managers/StaffPermissionV2Manager");
        const page = require("../../pages/staff/StaffPermissionsPage");
        const { replyError } = require(
            "../../core/services/InteractionResponseService"
        );

        if (!policy.canManagePermissions(interaction)) {
            await replyError(
                interaction,
                "Tu ne peux pas modifier les permissions GreyCore."
            );
            return true;
        }

        const current = manager.getValidationChannelAccess(
            interaction.guildId
        );
        manager.setValidationChannelAccess({
            guildId: interaction.guildId,
            enabled: !current,
            updatedBy: interaction.user.id
        });
        await interaction.update(
            page.buildAccessSelection(interaction.guildId)
        );
        return true;
    }

    if (interaction.customId === "v2_staff_characters_pending") {
        const manager = require("../../services/validation/ValidationManagerV2");
        const view = require("../../views/validation/PendingValidationsView");
        const navigation = require("../../pages/staff/StaffCharactersPage")
            .navigationRow();
        const payload = view.build(
            interaction.guildId,
            manager.getPendingForGuild(interaction.guildId)
        );
        await interaction.update({ ...payload, components: [navigation] });
        return true;
    }

    if (interaction.customId === "v2_staff_characters_roster") {
        const { EmbedBuilder } = require("discord.js");
        const manager = require("../../managers/CharacterRosterV2Manager");
        const roster = manager.getRoster(interaction.guildId, {
            includeArchived: true
        });
        const lines = roster.slice(0, 60).map(character =>
            `${character.is_archived ? "📦" : "✅"} **${character.firstname || character.proxy_name}** — <@${character.discord_user_id}>`
        );
        await interaction.update({
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("👥 Personnages du serveur")
                .setDescription(lines.join("\n").slice(0, 3900) || "Aucun personnage installé.")
                .setFooter({ text: `${roster.length} personnage(s) au total` })],
            components: [require("../../pages/staff/StaffCharactersPage").navigationRow()]
        });
        return true;
    }

    if (interaction.customId === "v2_staff_characters_users") {
        const { ActionRowBuilder, UserSelectMenuBuilder } = require("discord.js");
        await interaction.update({
            content: "Choisis l'utilisateur dont tu souhaites gérer les personnages.",
            embeds: [],
            components: [
                new ActionRowBuilder().addComponents(
                    new UserSelectMenuBuilder()
                        .setCustomId("v2_staff_characters_user_select")
                        .setPlaceholder("Choisir un utilisateur")
                        .setMinValues(1)
                        .setMaxValues(1)
                ),
                require("../../pages/staff/StaffCharactersPage").navigationRow()
            ]
        });
        return true;
    }

    if (
        interaction.customId.startsWith("v2_staff_characters_archive:")
        || interaction.customId.startsWith("v2_staff_characters_restore:")
    ) {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canAccess(interaction, "characters", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }
        const manager = require("../../managers/CharacterRosterV2Manager");
        const userId = interaction.customId.split(":")[1];
        const archive = interaction.customId.includes("_archive:");
        const result = archive
            ? manager.archiveOwnerCharacters(interaction.guildId, userId)
            : manager.restoreOwnerCharacters(interaction.guildId, userId);
        await interaction.update({
            content: `✅ ${result.updated.length} personnage(s) ${archive ? "archivé(s)" : "restauré(s)"} pour <@${userId}>.`,
            embeds: [],
            components: [require("../../pages/staff/StaffCharactersPage").navigationRow()]
        });
        return true;
    }

    if (interaction.customId.startsWith("v2_staff_scenes_")) {
        const policy = require("../../core/policies/StaffPermissionPolicy");
        const { replyError } = require("../../core/services/InteractionResponseService");
        if (!policy.canAccess(interaction, "scenes", { write: true })) {
            await replyError(interaction, "Tu disposes uniquement d'un accès en lecture.");
            return true;
        }

        const action = interaction.customId.slice("v2_staff_scenes_".length);
        const manager = require("../../managers/SceneAssistantV2Manager");
        const page = require("../../pages/staff/StaffScenesPage");
        if (action === "toggle") {
            const current = manager.getConfiguration(interaction.guildId);
            if (Number(current?.is_enabled) === 1) {
                manager.disable(interaction.guildId);
            } else {
                manager.configure({
                    guildId: interaction.guildId,
                    durationDays: current?.duration_days || 8,
                    recommendedMessageCount: current?.recommended_message_count || 100,
                    inactivityHours: current?.inactivity_hours || 48
                });
            }
            await interaction.update(page.build(interaction));
            return true;
        }

        if (action === "add_zone") {
            const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType } = require("discord.js");
            await interaction.update({
                content: "Choisis le salon, le forum ou la catégorie RP à suivre.",
                embeds: [],
                components: [
                    new ActionRowBuilder().addComponents(
                        new ChannelSelectMenuBuilder()
                            .setCustomId("v2_staff_scenes_zone_select")
                            .setPlaceholder("Choisir une zone RP")
                            .setChannelTypes(
                                ChannelType.GuildText,
                                ChannelType.GuildForum,
                                ChannelType.GuildCategory
                            )
                    ),
                    page.build(interaction).components.at(-1)
                ]
            });
            return true;
        }

        if (action === "add_current_category") {
            let current = interaction.channel;
            let category = null;
            while (current) {
                if (current.type === require("discord.js").ChannelType.GuildCategory) {
                    category = current;
                    break;
                }
                current = current.parent || null;
            }
            if (!category) {
                await replyError(interaction, "Ce salon n'est placé dans aucune catégorie Discord.");
                return true;
            }
            manager.addScope({
                guildId: interaction.guildId,
                channelId: category.id,
                createdBy: interaction.user.id
            });
            await interaction.update(page.build(interaction));
            return true;
        }

        if (action === "configure" || action === "add_expression") {
            const {
                ModalBuilder, TextInputBuilder, TextInputStyle,
                ActionRowBuilder
            } = require("discord.js");
            const configuration = manager.getConfiguration(interaction.guildId);
            const modal = new ModalBuilder()
                .setCustomId(
                    action === "configure"
                        ? "v2_staff_scenes_config_submit"
                        : "v2_staff_scenes_expression_submit"
                )
                .setTitle(
                    action === "configure"
                        ? "Configurer les scènes"
                        : "Expression de rattrapage"
                );
            if (action === "add_expression") {
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("expression")
                        .setLabel("Expression à reconnaître")
                        .setPlaceholder("Ex. On passe en privé ?")
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(100)
                        .setRequired(true)
                ));
            } else {
                modal.addComponents(
                    inputRow("duration_days", "Durée recommandée en jours (facultatif)", configuration?.duration_days),
                    inputRow("message_count", "Messages recommandés (facultatif)", configuration?.recommended_message_count),
                    inputRow("inactivity_hours", "Inactivité avant clôture (heures)", configuration?.inactivity_hours || 48, true)
                );
            }
            await interaction.showModal(modal);
            return true;
        }
    }

    if (interaction.customId !== "staff_close") return false;

    await interaction.update({
        content: "✅ Centre d'administration fermé.",
        embeds: [],
        components: []
    });
    return true;
};

function inputRow(customId, label, value, required = false) {
    const { ActionRowBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
    const input = new TextInputBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(TextInputStyle.Short)
        .setRequired(required);
    if (value != null && String(value)) input.setValue(String(value));
    return new ActionRowBuilder().addComponents(input);
}
