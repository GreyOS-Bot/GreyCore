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
                        .setCustomId("v3_staff_permissions_role")
                        .setPlaceholder("Choisir un rôle")
                        .setMinValues(1)
                        .setMaxValues(1)
                ),
                new ActionRowBuilder().addComponents(
                    new UserSelectMenuBuilder()
                        .setCustomId("v3_staff_permissions_user")
                        .setPlaceholder("Choisir un utilisateur")
                        .setMinValues(1)
                        .setMaxValues(1)
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("v3_staff_permission_defaults")
                        .setLabel("Valeurs par défaut du serveur")
                        .setEmoji("⚖️")
                        .setStyle(ButtonStyle.Primary)
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

    buildV3PermissionSelection(draft) {
        const permissions = catalog.all();
        if (permissions.length > 25) {
            return this.buildCatalogOverflow();
        }
        const mention = draft.subjectType === "user"
            ? `<@${draft.subjectId}>`
            : `<@&${draft.subjectId}>`;
        return {
            content: "",
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("🔐 Choisir une permission")
                .setDescription([
                    `Sujet : ${mention}`,
                    "Choisis un seul domaine à examiner ou modifier.",
                    "**Précédence :** utilisateur > rôles > valeur par défaut du serveur > lecture seule."
                ].join("\n\n"))],
            components: [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`v3_staff_permissions_key:${draft.token}`)
                        .setPlaceholder("Choisir une permission")
                        .setMinValues(1)
                        .setMaxValues(1)
                        .addOptions(permissions.map(permission => ({
                            label: permission.label,
                            value: permission.key,
                            emoji: permission.emoji
                        })))
                ),
                navigationRow()
            ]
        };
    }

    buildV3PermissionState(draft, assignment, notice = "") {
        const state = describeState(assignment);
        const mention = draft.subjectType === "user"
            ? `<@${draft.subjectId}>`
            : `<@&${draft.subjectId}>`;
        const permission = catalog.get(draft.permissionKey);
        const descriptions = [
            `Sujet : ${mention}`,
            `Permission : ${permission?.emoji || "🔐"} **${permission?.label || draft.permissionKey}**`,
            `État actuel : **${state.label}**`,
            "**Précédence :** utilisateur > rôles > valeur par défaut du serveur > lecture seule."
        ];
        if (draft.permissionKey === "read_only") {
            descriptions.push(
                "ℹ️ Lecture seule s’applique uniquement lorsqu’aucune règle spécifique n’existe pour le domaine. Un allow ou deny explicite reste prioritaire."
            );
        }
        if (notice) descriptions.unshift(notice);
        return {
            content: "",
            embeds: [new EmbedBuilder()
                .setColor(state.color)
                .setTitle("🔐 Permission GreyCore")
                .setDescription(descriptions.join("\n\n"))],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`v3_staff_permissions_set:${draft.token}:allow`)
                        .setLabel("Autoriser")
                        .setEmoji("✅")
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(assignment?.effect === "allow"),
                    new ButtonBuilder()
                        .setCustomId(`v3_staff_permissions_set:${draft.token}:deny`)
                        .setLabel("Refuser")
                        .setEmoji("⛔")
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(assignment?.effect === "deny"),
                    new ButtonBuilder()
                        .setCustomId(`v3_staff_permissions_set:${draft.token}:unset`)
                        .setLabel("Hériter / retirer")
                        .setEmoji("➖")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!assignment)
                ),
                navigationRow()
            ]
        };
    }

    buildV3DefaultPermissionSelection(draft) {
        const permissions = catalog.all();
        if (permissions.length > 25) {
            return this.buildCatalogOverflow();
        }
        return {
            content: "",
            embeds: [new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("⚖️ Valeurs par défaut du serveur")
                .setDescription([
                    "Choisis une permission dont tu veux définir la valeur par défaut.",
                    "Le default s’applique uniquement lorsqu’aucune règle utilisateur ou rôle ne décide déjà cette permission.",
                    "**Non défini** permet encore le fallback Lecture seule. **Refusé** bloque ce fallback pour ce domaine."
                ].join("\n\n"))],
            components: [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(
                            `v3_staff_permission_default_key:${draft.token}`
                        )
                        .setPlaceholder("Choisir une permission")
                        .setMinValues(1)
                        .setMaxValues(1)
                        .addOptions(permissions.map(permission => ({
                            label: permission.label,
                            value: permission.key,
                            emoji: permission.emoji
                        })))
                ),
                navigationRow()
            ]
        };
    }

    buildV3DefaultPermissionState(draft, current, notice = "") {
        const state = describeDefaultState(current);
        const permission = catalog.get(draft.permissionKey);
        const descriptions = [
            `Permission : ${permission?.emoji || "⚖️"} **${permission?.label || draft.permissionKey}**`,
            `État actuel : **${state.label}**`,
            "Le default s’applique uniquement lorsqu’aucune règle utilisateur ou rôle ne décide déjà cette permission.",
            "**Non défini** permet encore le fallback Lecture seule. **Refusé** bloque ce fallback pour ce domaine."
        ];
        if (draft.permissionKey === "read_only") {
            descriptions.push(
                "ℹ️ Un default Lecture seule ALLOW permet la consultation des domaines sans règle spécifique. DENY bloque ce fallback."
            );
        }
        if (notice) descriptions.unshift(notice);
        return {
            content: "",
            embeds: [new EmbedBuilder()
                .setColor(state.color)
                .setTitle("⚖️ Default de permission")
                .setDescription(descriptions.join("\n\n"))],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            `v3_staff_permission_default_set:${draft.token}:allow`
                        )
                        .setLabel("Autoriser par défaut")
                        .setEmoji("✅")
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(current?.effect === "allow"),
                    new ButtonBuilder()
                        .setCustomId(
                            `v3_staff_permission_default_set:${draft.token}:deny`
                        )
                        .setLabel("Refuser par défaut")
                        .setEmoji("⛔")
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(current?.effect === "deny"),
                    new ButtonBuilder()
                        .setCustomId(
                            `v3_staff_permission_default_set:${draft.token}:unset`
                        )
                        .setLabel("Non défini")
                        .setEmoji("➖")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!current)
                ),
                navigationRow()
            ]
        };
    }

    buildCatalogOverflow() {
        return {
            content: "⚠️ Le catalogue contient plus de 25 permissions. Cette interface doit être paginée avant utilisation.",
            embeds: [],
            components: [navigationRow()]
        };
    }

    buildPermissionSelection(guildId, subjectIds, subjectType = "role") {
        const normalizedIds = Array.isArray(subjectIds)
            ? subjectIds.map(String)
            : [String(subjectIds)];
        const permissionSets = normalizedIds.map(subjectId => new Set(
            subjectType === "user"
                ? manager.getUserPermissions(guildId, subjectId)
                : manager.getRolePermissions(guildId, subjectId)
        ));
        const granted = new Set(
            [...(permissionSets[0] || [])].filter(key =>
                permissionSets.every(set => set.has(key))
            )
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
                .setTitle("🔐 Autorisations GreyCore")
                .setDescription([
                    subjectType === "user"
                        ? `Utilisateurs sélectionnés : ${normalizedIds.map(id => `<@${id}>`).join(" ")}`
                        : `Rôles sélectionnés : ${normalizedIds.map(id => `<@&${id}>`).join(" ")}`,
                    "Sélectionne tous les domaines puis valide. Les mêmes autorisations seront appliquées à toute la sélection.",
                    "**Lecture seule** permet de consulter les pages sans effectuer de modification."
                ].join("\n\n"))],
            components: [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(
                            `v2_staff_permissions_save:${subjectType}`
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

function describeState(assignment) {
    if (!assignment) return { label: "➖ Hérité / non défini", color: 0x99AAB5 };
    if (assignment.effect === null) {
        return { label: "🕰️ Autorisé (legacy)", color: 0xFEE75C };
    }
    if (assignment.effect === "deny") {
        return { label: "⛔ Refusé", color: 0xED4245 };
    }
    return { label: "✅ Autorisé", color: 0x57F287 };
}

function describeDefaultState(current) {
    if (!current) return { label: "➖ Aucun default / non défini", color: 0x99AAB5 };
    if (current.effect === "deny") {
        return { label: "⛔ Refusé par défaut", color: 0xED4245 };
    }
    return { label: "✅ Autorisé par défaut", color: 0x57F287 };
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
