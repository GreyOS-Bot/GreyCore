const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const catalog = require("../../core/permissions/StaffPermissionCatalog");
const policy = require("../../core/policies/StaffPermissionPolicy");
const decisionService = require("../../core/services/StaffPermissionDecisionService");
const administrativeAccess = require(
    "../../core/services/AdministrativePermissionAccessService"
);

const STRICT_ADMINISTRATIVE_SECTIONS = new Set([
    "settings",
    "logs",
    "automations",
    "scenes",
    "modules"
]);

const CONTENT = {
    characters: ["Validations", "Fiches et corrections", "Installations", "Archives et suppressions"],
    scenes: ["Zones RP", "Cycles actifs", "Expressions de rattrapage", "Seuils et inactivité"],
    phone: ["SMS et MMS", "Appels", "Conversations de groupe", "Réglages"],
    bank: ["Fonctions financières", "Historique bancaire", "Réglages bancaires"],
    relationships: ["Types de relations", "Demandes", "Arbres familiaux", "Modération"],
    universe: ["États", "Organisations", "Référentiels", "Documentation du serveur"],
    entities: ["Identité narrative", "Messages", "Déclencheurs", "Activation"],
    automations: ["Accueil après validation", "Limites de création", "Annonces", "Rappels"],
    modules: ["Modules actifs", "Installation des outils", "Disponibilité par serveur"],
    logs: ["Salon des erreurs", "Alertes", "Historique technique"],
    settings: ["Salons GreyCore", "Confidentialité", "Maintenance", "Paramètres généraux"]
};

class StaffSectionPage {
    async execute(interaction, sectionKey) {
        if (sectionKey === "permissions") {
            if (!policy.canManagePermissions(interaction)) {
                return deny(interaction);
            }
            return require("./StaffPermissionsPage").execute(interaction);
        }

        if (sectionKey === "assets") {
            const decision = decisionService.decide({
                interaction,
                permission: "assets",
                write: false
            });
            if (!decision.allowed) return deny(interaction);
            return require("./StaffAssetsPage").execute(interaction);
        }

        const permissionKey = ["setup", "overview"].includes(sectionKey)
            ? "settings"
            : sectionKey;
        const section = catalog.get(permissionKey);
        const allowed = STRICT_ADMINISTRATIVE_SECTIONS.has(sectionKey)
            ? administrativeAccess.canRead(interaction, permissionKey)
            : policy.canAccess(interaction, permissionKey);
        if (!section || !allowed) {
            return deny(interaction);
        }

        if (sectionKey === "setup") {
            return require("./StaffSetupPage").execute(interaction);
        }
        if (sectionKey === "overview") {
            return require("./StaffConfigurationOverviewPage").execute(interaction);
        }

        if (sectionKey === "characters") {
            return require("./StaffCharactersPage").execute(interaction);
        }
        if (sectionKey === "scenes") {
            return require("./StaffScenesPage").execute(interaction);
        }
        if (sectionKey === "phone") {
            return require("./StaffPhonePage").execute(interaction);
        }
        if (sectionKey === "bank") {
            return require("./StaffBankPage").execute(interaction);
        }
        if (sectionKey === "relationships") {
            return require("./StaffRelationshipsPage").execute(interaction);
        }
        if (sectionKey === "universe") {
            return require("./StaffUniversePage").execute(interaction);
        }
        if (sectionKey === "entities") {
            return require("./StaffEntitiesPage").execute(interaction);
        }
        if (sectionKey === "automations") {
            return require("./StaffAutomationsPage").execute(interaction);
        }
        if (sectionKey === "modules") {
            return require("./StaffModulesPage").execute(interaction);
        }
        if (sectionKey === "logs") {
            return require("./StaffLogsPage").execute(interaction);
        }
        if (sectionKey === "settings") {
            return require("./StaffSettingsPage").execute(interaction);
        }

        const readOnly = !policy.canAccess(
            interaction,
            sectionKey,
            { write: true }
        );
        const features = CONTENT[sectionKey] || [];

        return interaction.update({
            embeds: [new EmbedBuilder()
                .setColor(readOnly ? 0x99AAB5 : 0x5865F2)
                .setTitle(`${section.emoji} ${section.label}`)
                .setDescription([
                    readOnly ? "👁️ Accès en lecture seule" : "Gestion autorisée",
                    "",
                    ...features.map(feature => `• ${feature}`),
                    "",
                    "Cette page constitue le nouveau point d'accès du domaine. Ses écrans détaillés seront raccordés progressivement sans retirer les commandes existantes."
                ].join("\n"))],
            components: [navigationRow()]
        });
    }
}

function deny(interaction) {
    return interaction.update({
        content: "❌ Tu n'as pas accès à cette partie de l'administration.",
        embeds: [],
        components: []
    });
}

function navigationRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("page:staff:home:root")
            .setLabel("Accueil")
            .setEmoji("🏠")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("v2_help:staff")
            .setLabel("Aide")
            .setEmoji("❓")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("staff_close")
            .setLabel("Fermer")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Secondary)
    );
}

module.exports = new StaffSectionPage();
