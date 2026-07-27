const {
    EmbedBuilder
} = require("discord.js");

const EVENT_CONFIG = {
    submitted: {
        emoji: "🟡",
        label: "Demande envoyée"
    },
    submission_cancelled: {
        emoji: "↩️",
        label: "Demande annulée"
    },
    approved: {
        emoji: "✅",
        label: "Installation validée"
    },
    rejected: {
        emoji: "❌",
        label: "Installation refusée"
    },
    suspended: {
        emoji: "⚠️",
        label: "Installation suspendue"
    },
    reopened: {
        emoji: "📝",
        label: "Installation remise en brouillon"
    },
    archived: {
        emoji: "📦",
        label: "Installation archivée"
    }
};

const STATUS_CONFIG = {
    draft: "📝 Brouillon",
    pending: "🟡 En attente",
    approved: "✅ Validée",
    rejected: "❌ Refusée",
    suspended: "⚠️ Suspendue",
    archived: "📦 Archivée"
};

class ValidationHistoryView {

    build({
        installation,
        entries
    }) {
        const characterName =
            String(
                installation.proxy_name
                || "Personnage sans nom"
            ).trim();

        const description = [
            `### ${characterName}`,
            `État actuel : ${this.formatStatus(installation.status)}`,
            "",
            entries.length
                ? entries.map(
                    entry => this.formatEntry(entry)
                ).join("\n\n")
                : "Aucune étape antérieure n’a été enregistrée pour cette installation."
        ].join("\n");

        return {
            embeds: [
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle("📚 Historique de validation")
                    .setDescription(
                        this.truncate(
                            description,
                            4_096
                        )
                    )
                    .setFooter({
                        text: `Greycore • Installation #${installation.id}`
                    })
            ]
        };
    }

    formatEntry(
        entry
    ) {
        const event =
            EVENT_CONFIG[entry.event_type]
            || {
                emoji: "•",
                label: "Mise à jour de l’installation"
            };

        const lines = [
            `${event.emoji} **${event.label}** • ${this.formatDate(entry.occurred_at)}`
        ];

        if (entry.actor_id) {
            lines.push(
                `↳ Par : ${this.formatActor(entry.actor_id)}`
            );
        }

        if (entry.reason) {
            lines.push(
                `↳ Motif : ${this.truncate(entry.reason, 500)}`
            );
        }

        return lines.join("\n");
    }

    formatStatus(
        status
    ) {
        return STATUS_CONFIG[status]
            || "ℹ️ Inconnu";
    }

    formatActor(
        actorId
    ) {
        const text =
            String(actorId).trim();

        return /^\d{16,20}$/.test(text)
            ? `<@${text}>`
            : text;
    }

    formatDate(
        value
    ) {
        const timestamp =
            Date.parse(value);

        if (!Number.isFinite(timestamp)) {
            return "date inconnue";
        }

        return `<t:${Math.floor(timestamp / 1_000)}:f>`;
    }

    truncate(
        value,
        maximumLength
    ) {
        const text =
            String(value || "").trim();

        if (text.length <= maximumLength) {
            return text;
        }

        return `${text.slice(0, maximumLength - 1)}…`;
    }
}

module.exports =
    new ValidationHistoryView();
