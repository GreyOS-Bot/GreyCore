const {
    EmbedBuilder
} = require("discord.js");

const {
    markInternalDelete
} = require(
    "../../../services/internalDeleteService"
);

const {
    parseProxy
} = require(
    "../../../services/proxyService"
);

const {
    resolveProxyCharacter,
    resolveCharacterByReference
} = require(
    "../../../services/proxy/ProxyCharacterResolver"
);

const proxyMessageManager =
    require(
        "../../../managers/ProxyMessageManager"
    );

const webhookManager =
    require(
        "../../../webhooks/webhookManager"
    );

const validationStaffPolicy =
    require(
        "../../../v2/core/policies/ValidationStaffPolicy"
    );

const {
    withThreadId
} = require(
    "../../../v2/core/services/ProxyThreadContext"
);

const originalMessageDeletionService =
    require(
        "../../../v2/core/services/OriginalMessageDeletionService"
    );

const discordAttachmentUrlService =
    require(
        "../../../v2/core/services/DiscordAttachmentUrlService"
    );

module.exports =
    async function proxyMessageHandler(
        message
    ) {
        if (!message.guild) {
            return false;
        }

        const proxy =
            parseProxy(
                message.content
            );

        if (!proxy) {
            return false;
        }

        const {
            character,
            v2Installation
        } = resolveProxyCharacter({
            discordUserId:
                message.author.id,
            guildId:
                message.guild.id,
            proxyName:
                proxy.character,
            isStaff:
                validationStaffPolicy
                    .canManageServerTools({
                        guildId:
                            message.guild.id,
                        guild:
                            message.guild,
                        member:
                            message.member,
                        client:
                            message.client,
                        memberPermissions:
                            message.member
                                ?.permissions
                    })
        });

        if (
            !character
            &&
            v2Installation
        ) {
            const messageText =
                v2Installation.access_denied
                    ? "❌ Ce personnage est réservé au staff de ce serveur."
                    : "❌ Ce personnage ne peut pas encore être joué : son installation doit être validée par le staff.";

            await message.reply(
                messageText
            );

            return true;
        }

        if (!character) {
            return false;
        }

        const webhook =
            await webhookManager
                .getOrCreateWebhook(
                    message.channel
                );

        const files =
            await downloadAttachments(
                message.attachments
            );

        const embeds =
            await buildReplyEmbeds(
                message
            );

        const avatarUrl =
            await discordAttachmentUrlService
                .resolve(
                    message.client,
                    character.avatar
                );

        const webhookMessage =
            await webhook.send(
                withThreadId(
                    message.channel,
                    {
                        content:
                            proxy.content
                            ||
                            undefined,
                        username:
                            character.name,
                        avatarURL:
                            avatarUrl
                            ||
                            null,
                        files,
                        embeds
                    }
                )
            );

        markInternalDelete(
            message.id
        );

        try {
            await originalMessageDeletionService
                .delete(message);
        } catch (error) {
            await webhook.deleteMessage(
                webhookMessage.id,
                withThreadId(
                    message.channel,
                    {}
                )
            ).catch(() => null);

            throw new Error(
                "Le proxy n’a pas été publié car le message original n’a pas pu être supprimé.",
                {
                    cause: error
                }
            );
        }

        proxyMessageManager.save({
            discordMessageId:
                message.id,
            webhookMessageId:
                webhookMessage.id,
            webhookId:
                webhook.id,
            channelId:
                message.channel.id,
            guildId:
                message.guild.id,
            authorId:
                message.author.id,
            characterId:
                character.id
        });

        console.log(
            `✅ Proxy envoyé : ${character.name} → ${webhookMessage.id}`
        );

        return true;
    };

async function downloadAttachments(
    attachments
) {
    const files = [];

    for (
        const attachment
        of attachments.values()
    ) {
        const response =
            await fetch(
                attachment.url
            );

        if (!response.ok) {
            throw new Error(
                `Impossible de télécharger ${attachment.name} : HTTP ${response.status}`
            );
        }

        const buffer =
            Buffer.from(
                await response.arrayBuffer()
            );

        files.push({
            attachment:
                buffer,
            name:
                attachment.name
                ||
                "fichier"
        });
    }

    return files;
}

async function buildReplyEmbeds(
    message
) {
    if (!message.reference?.messageId) {
        return [];
    }

    const referencedMessage =
        await message.channel.messages
            .fetch(
                message.reference.messageId
            )
            .catch(
                () => null
            );

    if (!referencedMessage) {
        return [];
    }

    const referencedAuthor =
        resolveReferencedAuthor(
            referencedMessage
        );

    const referencedContent =
        resolveReferencedContent(
            referencedMessage
        );

    const shortenedContent =
        referencedContent.length > 300
            ? `${referencedContent.slice(0, 297)}...`
            : referencedContent;

    const quotedContent =
        shortenedContent
            .split("\n")
            .map(
                line =>
                    `> ${line}`
            )
            .join("\n");

    return [
        new EmbedBuilder()
            .setColor("#2B2D31")
            .setAuthor({
                name:
                    `↩ Réponse à ${referencedAuthor}`
            })
            .setDescription(
                `${quotedContent}\n\n[Voir le message](${referencedMessage.url})`
            )
    ];
}

function resolveReferencedAuthor(
    referencedMessage
) {
    let referencedAuthor =
        referencedMessage.member
            ?.displayName
        ||
        referencedMessage.author
            ?.username
        ||
        "Message";

    const referencedProxy =
        proxyMessageManager
            .getByWebhookMessageId(
                referencedMessage.id
            );

    if (!referencedProxy) {
        return referencedAuthor;
    }

    const referencedCharacter =
        resolveCharacterByReference({
            characterId:
                referencedProxy
                    .character_id,
            characterVersion:
                referencedProxy
                    .character_version
                ||
                "v1"
        });

    if (referencedCharacter) {
        referencedAuthor =
            referencedCharacter.name;
    }

    return referencedAuthor;
}

function resolveReferencedContent(
    referencedMessage
) {
    const content =
        referencedMessage.content
            ?.trim();

    if (content) {
        return content;
    }

    if (
        referencedMessage
            .attachments.size > 0
    ) {
        return "📎 Pièce jointe";
    }

    return "Message sans texte";
}
