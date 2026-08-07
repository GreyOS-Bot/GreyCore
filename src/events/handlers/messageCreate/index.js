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
                    sceneAssistantService.buildMoveIntentPrompt(
                        result.cycle
                    )
                );
            }

            if (
                result?.kind === "no_active_scene"
                && result.shouldPrompt
            ) {
                await message.channel.send(
                    sceneAssistantService.buildStartPrompt()
                );
            }
        } catch (error) {
            console.error(
                "[SceneAssistant] Impossible de suivre le cycle :",
                error
            );
        }

        return proxyHandled;
    };
