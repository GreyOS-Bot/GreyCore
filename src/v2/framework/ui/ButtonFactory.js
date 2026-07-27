const {
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

class ButtonFactory {

    primary({
        id,
        label,
        emoji,
        disabled = false
    }) {

        return new ButtonBuilder()

            .setCustomId(id)

            .setLabel(label)

            .setStyle(
                ButtonStyle.Primary
            )

            .setDisabled(disabled)

            .setEmoji(emoji);
    }

    secondary({
        id,
        label,
        emoji,
        disabled = false
    }) {

        return new ButtonBuilder()

            .setCustomId(id)

            .setLabel(label)

            .setStyle(
                ButtonStyle.Secondary
            )

            .setDisabled(disabled)

            .setEmoji(emoji);
    }

    success({
        id,
        label,
        emoji,
        disabled = false
    }) {

        return new ButtonBuilder()

            .setCustomId(id)

            .setLabel(label)

            .setStyle(
                ButtonStyle.Success
            )

            .setDisabled(disabled)

            .setEmoji(emoji);
    }

    danger({
        id,
        label,
        emoji,
        disabled = false
    }) {

        return new ButtonBuilder()

            .setCustomId(id)

            .setLabel(label)

            .setStyle(
                ButtonStyle.Danger
            )

            .setDisabled(disabled)

            .setEmoji(emoji);
    }

}

module.exports =
    new ButtonFactory();