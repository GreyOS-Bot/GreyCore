const {
    EmbedBuilder
} = require("discord.js");

const {
    requireStaffCommandAccess
} = require(
    "../../core/services/StaffCommandAccessService"
);

const {
    deferPrivate,
    editOrReplyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function announcementModalRouter(
        interaction
    ) {
        if (
            !interaction.isModalSubmit()
            || interaction.customId !==
                "v2_announcement_submit"
        ) {
            return false;
        }

        const internalAccess = require("../../core/policies/StaffPermissionPolicy")
            .canAccess(interaction, "automations", { write: true });
        if (!internalAccess && !await requireStaffCommandAccess(interaction)) return true;

        await deferPrivate(interaction);

        const mentionInput = interaction.fields
            .getTextInputValue(
                "announcement_mention"
            )
            .trim();

        const mention =
            parseMention(mentionInput);

        if (!mention.valid) {
            await editOrReplyError(
                interaction,
                "La mention doit être @everyone, @here ou une mention de rôle Discord."
            );

            return true;
        }

        const title = interaction.fields
            .getTextInputValue(
                "announcement_title"
            )
            .trim();

        const message = interaction.fields
            .getTextInputValue(
                "announcement_message"
            )
            .trim();

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(
                title || "📢 Annonce"
            )
            .setDescription(message)
            .setFooter({
                text:
                    `Publié par ${interaction.user.globalName || interaction.user.username}`
            })
            .setTimestamp();

        const published =
            await interaction.channel.send({
                content:
                    mention.content
                    || undefined,
                embeds: [embed],
                allowedMentions:
                    mention.allowedMentions
            });

        await interaction.editReply({
            content:
                `✅ Annonce publiée : ${published.url}`
        });

        return true;
    };

function parseMention(value) {
    if (!value) {
        return {
            valid: true,
            content: null,
            allowedMentions: {
                parse: []
            }
        };
    }

    const normalized =
        value.toLowerCase();

    if (
        normalized === "@everyone"
        || normalized === "@here"
    ) {
        return {
            valid: true,
            content: normalized,
            allowedMentions: {
                parse: ["everyone"]
            }
        };
    }

    const roleMatch =
        value.match(/^<@&(\d{17,20})>$/);

    if (roleMatch) {
        return {
            valid: true,
            content: value,
            allowedMentions: {
                parse: [],
                roles: [roleMatch[1]]
            }
        };
    }

    return {
        valid: false
    };
}

module.exports.parseMention =
    parseMention;
