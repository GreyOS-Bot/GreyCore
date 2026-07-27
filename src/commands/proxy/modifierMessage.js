const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

const proxyMessageManager = require("../../managers/ProxyMessageManager");

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName("Modifier le proxy")
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const targetMessage = interaction.targetMessage;

        const proxyRecord = proxyMessageManager.getByWebhookMessageId(targetMessage.id);

        if (!proxyRecord) {
            return interaction.reply({
                content: "❌ Ce message n'est pas un message proxy Greycore.",
                ephemeral: true
            });
        }

        if (proxyRecord.author_id !== interaction.user.id) {
            return interaction.reply({
                content: "❌ Tu ne peux modifier que tes propres messages proxy.",
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(`proxy_edit_modal:${proxyRecord.discord_message_id}`)
            .setTitle("Modifier le message proxy");

        const contentInput = new TextInputBuilder()
            .setCustomId("proxy_content")
            .setLabel("Message")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setValue(targetMessage.content || "");

        modal.addComponents(
            new ActionRowBuilder().addComponents(contentInput)
        );

        return interaction.showModal(modal);
    }
};