const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const stateManager =
    require("../managers/StateManager");

const stateTypesAutocomplete =
    require(
        "../autocomplete/stateTypes"
    );

const {
    requireStaffCommandAccess
} = require(
    "../v2/core/services/StaffCommandAccessService"
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("supprimer-etat")
        .setDescription(
            "Supprime un type d’état du serveur."
        )
        .addStringOption(option =>
            option
                .setName("type")
                .setDescription(
                    "Type d’état à supprimer"
                )
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focusedOption =
            interaction.options.getFocused(
                true
            );

        if (
            focusedOption.name ===
            "type"
        ) {
            await stateTypesAutocomplete(
                interaction
            );

            return;
        }

        await interaction.respond([]);
    },

    async execute(interaction) {
        if (
            !await requireStaffCommandAccess(
                interaction
            )
        ) {
            return;
        }

        const stateTypeId =
            Number(
                interaction.options.getString(
                    "type"
                )
            );

        const stateType =
            stateManager.getStateTypeById(
                stateTypeId
            );

        if (
            !stateType ||
            stateType.guildId !== interaction.guild.id
        ) {
            return interaction.reply({
                content:
                    "❌ Ce type d’état est introuvable sur ce serveur.",
                ephemeral: true
            });
        }

        const usageCount =
            stateManager.countStatesUsingType(
                interaction.guild.id,
                stateType.id
            );

        const warning =
            usageCount > 0
                ? `⚠️ Ce type est utilisé par **${usageCount} état(s)**. Ils seront également supprimés.`
                : "Aucun personnage n’utilise actuellement ce type.";

        const actions =
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        `state_type_delete_confirm:${stateType.id}`
                    )
                    .setLabel("Supprimer définitivement")
                    .setEmoji("🗑️")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId(
                        "state_type_delete_cancel"
                    )
                    .setLabel("Annuler")
                    .setEmoji("❌")
                    .setStyle(ButtonStyle.Secondary)
            );

        return interaction.reply({
            content: [
                `🗑️ **Supprimer le type d’état ${stateType.name} ?**`,
                "",
                warning,
                "",
                "Cette action est irréversible."
            ].join("\n"),
            components: [actions],
            ephemeral: true
        });
    }
};
