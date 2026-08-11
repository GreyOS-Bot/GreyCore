const pendingUploadRouter =
    require(
        "./PendingUploadRouter"
    );

const proxyMessageHandler =
    require(
        "./ProxyMessageHandler"
    );

const sceneAssistantService =
    require(
        "../../../v2/services/scenes/SceneAssistantService"
    );

const guildSettingsManager =
    require(
        "../../../v2/managers/GuildSettingsV2Manager"
    );

const narrativeEntityService =
    require(
        "../../../v2/services/entities/NarrativeEntityService"
    );

const logger =
    require(
        "../../../v2/core/services/TechnicalLogger"
    ).create("MessageCreateRouter");

module.exports =
    async function messageCreateRouter(
        message
    ) {
        if (message.author.bot) {
            return false;
        }

        if (
            message.guildId
            && guildSettingsManager
                .isMaintenanceEnabled(
                    message.guildId
                )
        ) {
            return false;
        }

        if (
            await pendingUploadRouter(
                message
            )
        ) {
            return true;
        }

        const proxyHandled =
            await proxyMessageHandler(
                message
            );

        let entityHandled = false;
        try {
            entityHandled = await narrativeEntityService
                .processMessage(message);
        } catch (error) {
            logger.warn(
                "Impossible de faire répondre une Entité :",
                error
            );
        }

        try {
            const result =
                await sceneAssistantService
                    .processMessage(message);

            if (result?.justReachedThreshold) {
                await message.channel.send({
                    embeds: [
                        sceneAssistantService
                            .buildThresholdEmbed()
                    ]
                });
            }

            if (result?.moveIntentDetected) {
                await message.channel.send(
                    result.cycle
                        ? sceneAssistantService.buildMoveIntentPrompt(result.cycle)
                        : sceneAssistantService.buildNewMoveIntentPrompt()
                );
            }


            if (result?.closureIntentDetected) {
                await message.channel.send(
                    sceneAssistantService.buildManualClosurePrompt(result.cycle)
                );
            }

            if (
                result?.kind === "no_active_scene"
                && result.shouldOfferStart
            ) {
                const targetMessage =
                    message.greycoreProxyWebhookMessage
                    || message;
                const proposed = sceneAssistantService
                    .proposeStartFromMessage({
                        message: targetMessage,
                        guildId: message.guildId,
                        channelId: message.channelId,
                        characterId: result.characterId
                    });

                if (proposed) {
                    await targetMessage.react("🎬");
                }
            }

            if (result?.cancelledClosurePrompt) {
                const prompt = result.cancelledClosurePrompt;
                const promptMessage = await message.channel.messages
                    .fetch(prompt.message_id)
                    .catch(() => null);
                await promptMessage?.delete?.().catch(() => null);
            }
        } catch (error) {
            console.error(
                "[SceneAssistant] Impossible de suivre le cycle :",
                error
            );
        }

        return proxyHandled || entityHandled;
    };
