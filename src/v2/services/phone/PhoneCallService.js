const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Routes
} = require("discord.js");

const webhookManager =
    require(
        "../../../webhooks/webhookManager"
    );

const {
    getThreadId,
    withThreadId
} = require(
    "../../core/services/ProxyThreadContext"
);

const PhoneCallSessionManager =
    require(
        "../../managers/PhoneCallSessionManager"
    );

const logger =
    require(
        "../../core/services/TechnicalLogger"
    ).create(
        "PhoneCallService"
    );

class PhoneCallService {

    getCharacterDisplayName(
        character
    ) {
        return String(
            character?.display_name
            || character?.displayName
            || character?.proxy_name
            || character?.name
            || "Personnage"
        ).trim();
    }

    formatCallContent(
        contactName,
        content
    ) {

        return [
            `📱 **Appel avec ${contactName}**`,
            "",
            content
        ].join("\n");

    }

    buildReplyComponents(
        callId,
        otherCharacter
    ) {

        if (
            !otherCharacter
            ||
            !otherCharacter.id
        ) {
            return [];
        }

        return [

            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `v2_phone_call_speak:${callId}:${otherCharacter.id}`
                        )
                        .setLabel(
                            "Parler"
                        )
                        .setEmoji(
                            "🎙️"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        )

                )

        ];

    }

    async getChannel(
        client,
        channelId,
        guildId
    ) {

        if (
            !client
            ||
            !channelId
        ) {

            throw new Error(
                "Le salon RP de cet appel est introuvable."
            );

        }

        const channel =
            await client.channels
                .fetch(
                    channelId
                )
                .catch(
                    () => null
                );

        if (
            !channel
            ||
            !channel.isTextBased()
        ) {

            throw new Error(
                "Le salon RP de cet appel n’est plus accessible."
            );

        }

        if (
            guildId
            &&
            channel.guildId
            &&
            String(
                channel.guildId
            ) !==
            String(
                guildId
            )
        ) {

            throw new Error(
                "Le salon RP ne correspond pas au serveur de l’appel."
            );

        }

        return channel;

    }

    async sendFirstSpeech({
        channel,
        callId,
        character,
        otherCharacter,
        contactName,
        cleanContent
    }) {

        return webhookManager.sendWithWebhook(
            channel,
            {

            content:
                this.formatCallContent(
                    contactName,
                    cleanContent
                ),

            username:
                this.getCharacterDisplayName(
                    character
                ),

            avatarURL:
                character.avatar_url
                || null,

            components:
                this.buildReplyComponents(
                    callId,
                    otherCharacter
                ),

                    allowedMentions: {
                        parse: []
                    }
                }
        );

    }

    async sendReplySpeech({
        client,
        channel,
        previousMessageId,
        callId,
        character,
        otherCharacter,
        contactName,
        cleanContent
    }) {

        const components =
            this.buildReplyComponents(
                callId,
                otherCharacter
            );

        const threadId =
            getThreadId(channel);

        /*
         * L’envoi passe directement par l’API Discord.
         * Cela permet d’ajouter message_reference sans
         * utiliser Webhook#send(), qui provoquait ici
         * l’erreur liée à resolvedId.
         */
        return webhookManager.sendWithWebhook(
            channel,
            {},
            {
                sendAttempt: async webhook => {
                    if (!webhook.token) {
                        throw new Error(
                            "Le webhook Greycore ne possède pas de jeton utilisable."
                        );
                    }

                    const rawMessage =
                        await client.rest.post(

                            Routes.webhook(
                                webhook.id,
                                webhook.token
                            ),

                {
                    query:
                        new URLSearchParams({
                            wait:
                                "true",
                            ...(
                                threadId
                                    ? {
                                        thread_id:
                                            threadId
                                    }
                                    : {}
                            )
                        }),

                    body: {

                        content:
                            this.formatCallContent(
                                contactName,
                                cleanContent
                            ),

                        username:
                            this.getCharacterDisplayName(
                                character
                            ),

                        avatar_url:
                            character.avatar_url
                            || undefined,

                        components:
                            components.map(
                                component =>
                                    component.toJSON()
                            ),

                        allowed_mentions: {
                            parse: []
                        },

                        message_reference: {

                            type:
                                0,

                            message_id:
                                previousMessageId,

                            channel_id:
                                channel.id,

                            guild_id:
                                channel.guildId,

                            fail_if_not_exists:
                                false

                        }

                    }

                }

                        );

        /*
         * Le paramètre wait=true demande à Discord
         * de renvoyer le message créé.
         */
                    if (
                        !rawMessage
                        ||
                        !rawMessage.id
                    ) {

                        throw new Error(
                            "Discord n’a pas renvoyé le message téléphonique publié."
                        );

                    }

                    return webhook
                        .fetchMessage(
                            rawMessage.id,
                            threadId
                                ? {
                                    threadId:
                                        threadId
                                }
                                : undefined
                        )
                        .catch(
                            () => rawMessage
                        );
                }
            }
        );

    }

    async sendSpeech({
        client,
        channelId,
        guildId,
        callId,
        character,
        otherCharacter,
        contactName,
        content
    }) {

        const cleanContent =
            content?.trim();

        if (!cleanContent) {

            throw new Error(
                "Le message ne peut pas être vide."
            );

        }

        if (
            !character
            ||
            !character.id
        ) {

            throw new Error(
                "Le personnage qui parle est introuvable."
            );

        }

        const channel =
            await this.getChannel(
                client,
                channelId,
                guildId
            );

        const session =
            PhoneCallSessionManager
                .get(
                    callId
                );

        if (!session) {

            throw new Error(
                "La session de cet appel est introuvable."
            );

        }

        const previousMessageId =
            session.lastWebhookMessageId
            || null;

        let sent;

        /*
         * Le premier message n’a aucune référence.
         * On peut donc utiliser Webhook#send normalement.
         */
        if (!previousMessageId) {

            sent =
                await this.sendFirstSpeech({
                    channel,

                    callId,

                    character,

                    otherCharacter,

                    contactName,

                    cleanContent

                });

        } else {

            /*
             * Les messages suivants répondent au dernier
             * message de l’appel.
             */
            sent =
                await this.sendReplySpeech({

                    client,

                    channel,

                    previousMessageId,

                    callId,

                    character,

                    otherCharacter,

                    contactName,

                    cleanContent

                });

        }

        const webhook = sent.webhook;
        const webhookMessage =
            sent.webhookMessage;

        PhoneCallSessionManager
            .register(
                callId,
                {
                    lastWebhookMessageId:
                        webhookMessage.id,

                    lastWebhookId:
                        webhook.id
                }
            );

        return webhookMessage;

    }

    async finalizeCall({
        client,
        callId
    }) {

        const session =
            PhoneCallSessionManager
                .get(
                    callId
                );

        if (
            !session
            ||
            !session.channelId
        ) {
            return;
        }

        const channel =
            await this.getChannel(
                client,
                session.channelId,
                session.guildId
            );

        const webhook =
            await webhookManager
                .getOrCreateWebhook(
                    channel
                );

        /*
         * On enlève le bouton Parler du dernier
         * message publié.
         */
        if (
            session.lastWebhookMessageId
        ) {

            await webhook
                .editMessage(
                    session.lastWebhookMessageId,
                    withThreadId(
                        channel,
                        {
                            components: []
                        }
                    )
                )
                .catch(error => {

                    logger.warn(
                        "Impossible de retirer le bouton du dernier message d’appel.",
                        error
                    );

                });

        }

        /*
         * Message final dans le salon RP.
         */
        await channel.send({

            content:
                "📴 **Appel terminé**",

            allowedMentions: {
                parse: []
            }

        });

    }

}

module.exports =
    new PhoneCallService();
