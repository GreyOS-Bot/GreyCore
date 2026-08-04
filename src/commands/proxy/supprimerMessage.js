const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    MessageFlags
} = require("discord.js");

const proxyMessageManager =
    require("../../managers/ProxyMessageManager");

const {
    getThreadId
} = require(
    "../../v2/core/services/ProxyThreadContext"
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

        const webhook =
            await interaction.client
                .fetchWebhook(
                    proxyRecord.webhook_id
                );

        const threadId =
            getThreadId(
                interaction.targetMessage.channel
            );

        if (threadId) {
            await webhook.deleteMessage(
                proxyRecord.webhook_message_id,
                threadId
            );
        } else {
            await webhook.deleteMessage(
                proxyRecord.webhook_message_id
            );
        }

        proxyMessageManager.delete(
            proxyRecord.discord_message_id
        );

        return interaction.editReply({
            content:
                "🗑️ Message proxy supprimé."
        });
    }
};
