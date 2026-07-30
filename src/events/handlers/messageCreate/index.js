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

module.exports =
    async function messageCreateRouter(
        message
    ) {
        if (message.author.bot) {
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
        } catch (error) {
            console.error(
                "[SceneAssistant] Impossible de suivre le cycle :",
                error
            );
        }

        return proxyHandled;
    };
