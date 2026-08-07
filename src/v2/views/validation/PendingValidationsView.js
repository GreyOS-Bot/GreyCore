const { EmbedBuilder } = require("discord.js");

function build(guildId, pending) {
    const descriptions = pending.length
        ? splitDescriptions(
            pending.map(installation =>
                formatPendingInstallation(guildId, installation)
            )
        )
        : ["Aucune demande n’attend une décision du staff."];

    return {
        embeds: descriptions.map((description, index) =>
            new EmbedBuilder()
                .setColor(pending.length ? 0xFEE75C : 0x57F287)
                .setTitle("📋 Validations en attente")
                .setDescription(description)
                .setFooter({
                    text: pending.length
                        ? `${pending.length} demande(s) à traiter${descriptions.length > 1 ? ` • Page ${index + 1}/${descriptions.length}` : ""}`
                        : "Tout est à jour"
                })
        )
    };
}

function splitDescriptions(entries) {
    const pages = [];
    let page = "";
    for (const entry of entries) {
        const nextPage = page ? `${page}\n\n${entry}` : entry;
        if (page && nextPage.length > 3500) {
            pages.push(page);
            page = entry;
        } else {
            page = nextPage;
        }
    }
    if (page) pages.push(page);
    return pages;
}

function formatPendingInstallation(guildId, installation) {
    const link = buildMessageLink(guildId, installation);
    const timestamp = Date.parse(installation.submitted_at);
    const submittedAt = Number.isFinite(timestamp)
        ? `<t:${Math.floor(timestamp / 1000)}:R>`
        : "à une date inconnue";
    return [
        `**${installation.proxy_name}** — <@${installation.owner_id}>`,
        installation.continuity_name
            ? `📖 ${installation.continuity_name}`
            : "📖 Continuité non précisée",
        `⏳ Envoyée ${submittedAt}`,
        link
            ? `[Ouvrir la demande](${link})`
            : `Installation #${installation.id}`
    ].join("\n");
}

function buildMessageLink(guildId, installation) {
    if (!installation.validation_channel_id || !installation.validation_message_id) {
        return null;
    }
    return [
        "https://discord.com/channels",
        guildId,
        installation.validation_channel_id,
        installation.validation_message_id
    ].join("/");
}

module.exports = { build };
