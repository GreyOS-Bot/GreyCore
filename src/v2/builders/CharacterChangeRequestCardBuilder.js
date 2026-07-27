const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const REQUEST_LABELS = Object.freeze({
    profile_identity:
        "Identité",
    profile_information:
        "Informations",
    profile_story:
        "Histoire",
    avatar:
        "Avatar"
});

const FIELD_LABELS = Object.freeze({
    firstname:
        "Prénom",
    lastname:
        "Nom",
    age:
        "Âge",
    birthday:
        "Date de naissance",
    origin:
        "Origine",
    occupation:
        "Métier",
    gang:
        "Organisation",
    story:
        "Histoire"
});

const STATUS_CONFIG = Object.freeze({
    pending: {
        color:
            "#FEE75C",
        title:
            "🟡 Modification en attente"
    },
    approved: {
        color:
            "#57F287",
        title:
            "✅ Modification validée"
    },
    rejected: {
        color:
            "#ED4245",
        title:
            "❌ Modification refusée"
    },
    cancelled: {
        color:
            "#747F8D",
        title:
            "📦 Modification annulée"
    }
});

class CharacterChangeRequestCardBuilder {
    build(request, guildName) {
        const status =
            STATUS_CONFIG[request.status]
            || STATUS_CONFIG.pending;

        const embed =
            new EmbedBuilder()
                .setColor(status.color)
                .setTitle(status.title)
                .setDescription([
                    `**${request.proxy_name || "Personnage"}** demande une modification de sa section **${this.getRequestLabel(request)}**.`,
                    "",
                    `👤 Demandeur : <@${request.submitted_by}>`,
                    `🏠 Serveur : ${guildName || "Serveur inconnu"}`
                ].join("\n"))
                .addFields({
                    name:
                        "Modifications demandées",
                    value:
                        this.getChangesText(request),
                    inline:
                        false
                });

        const currentAvatar =
            request.local_avatar_url
            || request.global_avatar_url
            || null;

        if (currentAvatar) {
            embed.setThumbnail(currentAvatar);
        }

        if (
            request.request_type === "avatar"
            && request.changes?.avatarUrl
        ) {
            embed.setImage(
                request.changes.avatarUrl
            );
        }

        if (request.status === "rejected") {
            embed.addFields({
                name:
                    "Motif du refus",
                value:
                    this.cleanText(
                        request.rejection_reason
                    ),
                inline:
                    false
            });
        }

        if (request.reviewed_by) {
            embed.addFields({
                name:
                    "Décision du staff",
                value:
                    `<@${request.reviewed_by}>`,
                inline:
                    false
            });
        }

        const response = {
            embeds: [embed],
            components: []
        };

        if (request.status === "pending") {
            response.components.push(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `v2_change_request_approve:${request.id}`
                            )
                            .setLabel("Valider la modification")
                            .setEmoji("✅")
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(
                                `v2_change_request_reject:${request.id}`
                            )
                            .setLabel("Refuser")
                            .setEmoji("❌")
                            .setStyle(ButtonStyle.Danger)
                    )
            );
        }

        return response;
    }

    getRequestLabel(request) {
        return REQUEST_LABELS[
            request.request_type
        ] || "Fiche";
    }

    getChangesText(request) {
        if (request.request_type === "avatar") {
            return "Nouvel avatar à utiliser sur ce serveur.";
        }

        const changes =
            request.changes || {};

        const lines = Object.entries(changes)
            .map(
                ([field, value]) => [
                    `**${FIELD_LABELS[field] || field}**`,
                    this.cleanText(
                        request[field]
                    ),
                    "→",
                    this.cleanText(value)
                ].join(" ")
            );

        return this.truncate(
            lines.join("\n")
            || "Aucune information lisible."
        );
    }

    cleanText(value) {
        const text =
            String(value ?? "").trim();

        return text || "Non renseigné";
    }

    truncate(value, maximumLength = 1024) {
        if (value.length <= maximumLength) {
            return value;
        }

        return `${value.slice(0, maximumLength - 1)}…`;
    }
}

module.exports =
    new CharacterChangeRequestCardBuilder();
