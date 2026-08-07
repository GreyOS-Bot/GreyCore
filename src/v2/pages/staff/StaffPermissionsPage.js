const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    RoleSelectMenuBuilder,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder
} = require("discord.js");
const catalog = require("../../core/permissions/StaffPermissionCatalog");
const policy = require("../../core/policies/StaffPermissionPolicy");
const manager = require("../../managers/StaffPermissionV2Manager");

class StaffPermissionsPage {
    execute(interaction) {
        if (!policy.canManagePermissions(interaction)) {
            return interaction.update({
                content: "❌ Seul le propriétaire du serveur ou un administrateur Discord peut modifier les permissions GreyCore.",
                embeds: [],
                components: []
            });
        }

        return interaction.update(
            this.buildAccessSelection(interaction.guildId)
        );
    }

    buildAccessSelection(guildId) {
        const validationEnabled =
            manager.getValidationChannelAccess(guildId);
        return {
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("🔐 Permissions GreyCore")
                .setDescription([
                    "Attribue des droits à un rôle ou directement à une personne.",
                    `Accès par le salon de validation : **${validationEnabled ? "activé ✅" : "désactivé ❌"}**.`,
                    "Le propriétaire du serveur et les administrateurs Discord conservent toujours l'accès complet."
                ].join("\n\n"))],
            components: [
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId("v2_staff_permissions_role")
                        .setPlaceholder("Choisir un rôle")
                        .setMinValues(1)
                        .setMaxValues(1)
                ),
                new ActionRowBuilder().addComponents(
                    new UserSelectMenuBuilder()
                        .setCustomId("v2_staff_permissions_user")
                        .setPlaceholder("Choisir un utilisateur particulier")
                        .setMinValues(1)
                        .setMaxValues(1)
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("v2_staff_permissions_toggle_validation")
                        .setLabel(
                            validationEnabled
                                ? "Désactiver l'accès par validation"
                                : "Activer l'accès par validation"
                        )
                        .setEmoji(validationEnabled ? "🔒" : "🔓")
                        .setStyle(
                            validationEnabled
                                ? ButtonStyle.Danger
                                : ButtonStyle.Success
                        )
                ),
                navigationRow()
            ]
        };
    }

    buildPermissionSelection(guildId, subjectId, subjectType = "role") {
        const granted = new Set(
            subjectType === "user"
                ? manager.getUserPermissions(guildId, subjectId)
                : manager.getRolePermissions(guildId, subjectId)
        );
        const options = catalog.all().map(permission => ({
            label: permission.label,
            value: permission.key,
            emoji: permission.emoji,
            default: granted.has(permission.key)
        }));
        options.push({
            label: "Aucun accès — retirer les droits",
            value: "__none__",
            emoji: "🚫"
        });

        return {
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("🔐 Autorisations du rôle")
                .setDescription([
                    subjectType === "user"
                        ? `Utilisateur sélectionné : <@${subjectId}>`
                        : `Rôle sélectionné : <@&${subjectId}>`,
                    "Sélectionne tous les domaines autorisés puis valide le menu.",
                    "**Lecture seule** permet de consulter les pages sans effectuer de modification."
                ].join("\n\n"))],
            components: [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(
                            `v2_staff_permissions_save:${subjectType}:${subjectId}`
                        )
                        .setPlaceholder("Choisir les autorisations")
                        .setMinValues(1)
                        .setMaxValues(options.length)
                        .addOptions(options)
                ),
                navigationRow()
            ]
        };
    }
}

function navigationRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("page:staff:home:root")
            .setLabel("Accueil")
            .setEmoji("🏠")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("staff_close")
            .setLabel("Fermer")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Secondary)
    );
}

module.exports = new StaffPermissionsPage();
