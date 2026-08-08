const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

function build(status, activeScenes = []) {
    const lines = statusLines(status);
    const listedScenes = activeScenes.slice(0, 10);

    if (listedScenes.length) {
        lines.push(
            "",
            "**Scènes actives sur le serveur**",
            ...listedScenes.map(scene => {
                const channels = String(scene.channel_ids || "")
                    .split(",")
                    .filter(Boolean)
                    .map(id => `<#${id}>`)
                    .join(" → ") || "Salon indisponible";
                const state = scene.status === "conclude" ? " · À conclure" : "";
                return `• **${scene.title || "Scène RP"}** — ${channels} · ${Number(scene.rp_message_count || 0)} message(s)${state}`;
            })
        );
    }

    const embed = new EmbedBuilder()
        .setColor(status.kind === "tracked" && status.scene?.status === "conclude"
            ? 0xFEE75C
            : 0x5865F2)
        .setTitle("🎬 Scènes RP")
        .setDescription(lines.join("\n"))
        .setFooter({
            text: "GreyCore · Assistant discret et entièrement facultatif"
        });

    const components = [];
    if (status.kind === "not_started") {
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("v2_scene_start")
                .setLabel("Commencer une scène")
                .setEmoji("▶️")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("v2_scene_resume")
                .setLabel("Reprendre une scène")
                .setEmoji("🔗")
                .setStyle(ButtonStyle.Primary)
        ));
    }

    if (status.kind === "tracked" && status.scene?.id) {
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`v2_scene_move:${status.scene.id}`)
                .setLabel("Déplacer la scène")
                .setEmoji("➡️")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`v2_scene_close_now:${status.scene.id}`)
                .setLabel("Clôturer la scène")
                .setEmoji("🏁")
                .setStyle(ButtonStyle.Danger)
        ));
    }

    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("v2_library_home")
            .setLabel("Accueil")
            .setEmoji("🏠")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("character_close")
            .setLabel("Fermer")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Secondary)
    ));

    return { embeds: [embed], components };
}

function statusLines(status) {
    if (status.kind === "disabled") {
        return [
            "ℹ️ L’assistant de scènes est désactivé sur ce serveur.",
            "Tu peux continuer à jouer normalement : ce module reste toujours facultatif."
        ];
    }
    if (status.kind === "untracked") {
        return [
            "ℹ️ Le salon actuel ne fait pas partie des zones RP suivies.",
            "Ouvre cet écran depuis un salon RP configuré pour commencer ou reprendre une scène."
        ];
    }
    if (status.kind === "not_started") {
        return [
            "**Aucune scène active dans ce salon.**",
            "Tu peux en commencer une, reprendre une scène existante ou simplement continuer à RP sans utiliser l’assistant."
        ];
    }

    const evaluation = status.evaluation || {};
    const scene = status.scene || status.cycle;
    const details = [];
    if (evaluation.durationDays) {
        details.push(`🗓️ Jour **${evaluation.elapsedDays} / ${evaluation.durationDays}**`);
    }
    if (evaluation.recommendedMessageCount) {
        details.push(`💬 **${Number(scene.rp_message_count || 0)} / ${evaluation.recommendedMessageCount}** messages RP`);
    }

    return [
        `**Scène actuelle : ${scene.title || "Scène RP"}**`,
        scene.status === "conclude"
            ? "🟨 Cette scène a atteint une recommandation du serveur. Elle reste entièrement jouable."
            : "🟩 Cette scène est en cours.",
        ...details
    ];
}

module.exports = { build };
