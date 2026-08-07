const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const STATUS_LABELS = {
    draft: "Brouillon",
    pending: "En attente du staff",
    approved: "Validée",
    rejected: "Refusée",
    suspended: "Modification demandée"
};

function build(activity) {
    const relationships = activity.relationships || [];
    const corrections = activity.corrections || [];
    const installations = activity.installations || [];
    const lines = [];

    lines.push("**💞 Demandes de relation reçues**");
    lines.push(...(relationships.length
        ? relationships.map(item =>
            `• **${item.source_name}** souhaite lier son personnage à **${item.target_name}** (${item.label_a_to_b || item.label_b_to_a}).`
        )
        : ["Aucune demande en attente."]));

    lines.push("", "**📝 Corrections demandées par le staff**");
    lines.push(...(corrections.length
        ? corrections.map(item => `• **${item.character_name}** — ${item.reason || "Modification demandée."}`)
        : ["Aucune correction demandée."]));

    lines.push("", "**📨 Installations sur ce serveur**");
    lines.push(...(installations.length
        ? installations.slice(0, 15).map(item => {
            const rejection = item.rejection_reason ? ` — ${item.rejection_reason}` : "";
            return `• **${item.character_name}** — ${STATUS_LABELS[item.status] || item.status}${rejection}`;
        })
        : ["Aucune installation sur ce serveur."]));

    const components = relationships.slice(0, 3).map(item =>
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`v2_relationship_request_accept:${item.id}`)
                .setLabel(`Accepter · ${item.source_name}`.slice(0, 80))
                .setEmoji("✅")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`v2_relationship_request_reject:${item.id}`)
                .setLabel("Refuser")
                .setEmoji("❌")
                .setStyle(ButtonStyle.Danger)
        )
    );

    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("v2_library_home").setLabel("Accueil").setEmoji("🏠").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("character_close").setLabel("Fermer").setEmoji("❌").setStyle(ButtonStyle.Secondary)
    ));

    return {
        embeds: [new EmbedBuilder()
            .setColor(relationships.length || corrections.length ? 0xFEE75C : 0x5865F2)
            .setTitle("🔔 Notifications et suivis")
            .setDescription(lines.join("\n"))
            .setFooter({ text: "GreyCore · Ton activité sur ce serveur" })],
        components
    };
}

module.exports = { build };
