const { EmbedBuilder } = require("discord.js");

const colors =
    require("../theme/colors");

class EmbedFactory {

    create({

        title = null,

        description = null,

        thumbnail = null,

        color = colors.primary,

        footer = null,

        timestamp = false

    }) {

        const embed =
            new EmbedBuilder()
                .setColor(color);

        if (title !== null) {

            embed.setTitle(title);

        }

        if (description) {

            embed.setDescription(
                description
            );

        }

        if (thumbnail) {

            embed.setThumbnail(
                thumbnail
            );

        }

        if (footer) {

            embed.setFooter({

                text:
                    footer

            });

        }

        if (timestamp) {

            embed.setTimestamp();

        }

        return embed;

    }

}

module.exports =
    new EmbedFactory();