const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    MessageFlags
} = require("discord.js");

const proxyMessageManager =
    require("../../managers/ProxyMessageManager");

const historicalWebhookService = require(
    "../../v2/core/services/ProxyHistoricalWebhookService"
);

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName("Supprimer le proxy")
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const proxyRecord =
            proxyMessageManager
                .getByWebhookMessageId(
                    interaction.targetMessage.id
                );

        if (!proxyRecord) {
            return interaction.reply({
                content:
                    "❌ Ce message n'est pas un message proxy GreyCore.",
                flags: MessageFlags.Ephemeral
            });
        }

        if (
            proxyRecord.author_id !==
                interaction.user.id
        ) {
            return interaction.reply({
                content:
                    "❌ Tu ne peux supprimer que tes propres messages proxy.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const result =
            await historicalWebhookService.delete({
                client: interaction.client,
                guild:
                    interaction.guild
                    || interaction.targetMessage.guild
                    || null,
                channelId:
                    proxyRecord.channel_id,
                currentChannel:
                    interaction.targetMessage.channel,
                webhookId:
                    proxyRecord.webhook_id,
                webhookMessageId:
                    proxyRecord.webhook_message_id
            });

        if (
            result.status === "success"
            || result.status === "message_missing"
        ) {
            proxyMessageManager.delete(
                proxyRecord.discord_message_id
            );
        }

        return interaction.editReply({
            content:
                result.status === "success"
                    ? "🗑️ Message proxy supprimé."
                    : historicalWebhookService
                        .userMessage(result, "delete")
        });
    }
};
