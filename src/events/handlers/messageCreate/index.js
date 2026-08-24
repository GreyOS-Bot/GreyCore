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

const sceneAssistantManager =
    require(
        "../../../v2/managers/SceneAssistantV2Manager"
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

async function offerSceneStart(message, result) {
    const targetMessage =
        message.greycoreProxyWebhookMessage
        || message;
    const proposal = {
        message: targetMessage,
        guildId: message.guildId,
        channelId: message.channelId,
        characterId: result.characterId
    };

    let proposed = sceneAssistantService
        .proposeStartFromMessage(proposal);

    if (!proposed) {
        const pending = sceneAssistantManager
            .getPendingStartProposal(
                message.guildId,
                message.channelId
            );

        if (!pending) {
            return false;
        }

        const previousMessage = await message.channel.messages
            .fetch(pending.message_id)
            .catch(() => null);

        const previousReaction = previousMessage
            ?.reactions
            ?.cache
            ?.find?.(
                reaction => reaction.emoji?.name === "🎬"
            );

        if (previousReaction) {
            return false;
        }

        sceneAssistantManager.resolveStartProposal(
            message.guildId,
            message.channelId,
            "obsolete"
        );
        proposed = sceneAssistantService
            .proposeStartFromMessage(proposal);
    }

    if (!proposed) {
        return false;
    }

    try {
        await targetMessage.react("🎬");
        return true;
    } catch (error) {
        sceneAssistantManager.resolveStartProposal(
            message.guildId,
            message.channelId,
            "reaction_failed"
        );
        logger.warn(
            "Impossible d'ajouter la proposition de début de scène :",
            error
        );
        return false;
    }
}

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

        if (message.greycorePlayBlocked) {
            return true;
        }

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
                await offerSceneStart(message, result);
            }

            if (result?.cancelledClosurePrompt) {
                const prompt = result.cancelledClosurePrompt;
                const promptMessage = await message.channel.messages
                    .fetch(prompt.message_id)
                    .catch(() => null);
                await promptMessage?.delete?.().catch(() => null);
            }
        } catch (error) {
            logger.error(
                "Impossible de suivre le cycle :",
                error
            );
        }

        return proxyHandled || entityHandled;
    };

module.exports.offerSceneStart = offerSceneStart;
