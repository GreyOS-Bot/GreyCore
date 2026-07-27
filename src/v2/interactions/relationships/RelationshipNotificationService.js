const {
    ActionRowBuilder
} = require("discord.js");

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "RelationshipNotificationService"
    );

const UI =
    require("../../framework");

async function sendRequestNotification(
    client,
    request
) {
    const embed =
        UI.embed.create({
            title:
                "💌 Demande de relation",
            description:
                `**${request.requester_character_name}** souhaite créer `
                + `une relation **${request.label_a_to_b}** avec `
                + `**${request.target_character_name}**.`,
            timestamp:
                true
        });

    if (request.note) {
        embed.addFields({
            name:
                "📝 Contexte",
            value:
                String(
                    request.note
                ).slice(
                    0,
                    1024
                )
        });
    }

    const targetUser =
        await client.users.fetch(
            String(
                request.target_owner_id
            )
        );

    return targetUser.send({
        embeds: [
            embed
        ],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    UI.button.success({
                        id:
                            `v2_relationship_request_accept:${request.id}`,
                        label:
                            "Accepter",
                        emoji:
                            "✅"
                    }),
                    UI.button.danger({
                        id:
                            `v2_relationship_request_reject:${request.id}`,
                        label:
                            "Refuser",
                        emoji:
                            "❌"
                    })
                )
        ]
    });
}

async function notifyRequester(
    client,
    request,
    accepted
) {
    try {
        const requester =
            await client.users.fetch(
                String(
                    request.requester_owner_id
                )
            );

        await requester.send({
            content:
                accepted
                    ? `✅ **${request.target_character_name}** a accepté la relation **${request.label_a_to_b}** avec **${request.requester_character_name}**.`
                    : `❌ **${request.target_character_name}** a refusé la demande de relation avec **${request.requester_character_name}**.`
        });
    } catch (error) {
        logger.warn(
            "Impossible de notifier le demandeur de la réponse relationnelle :",
            error.message
        );
    }
}

module.exports = {
    sendRequestNotification,
    notifyRequester
};
