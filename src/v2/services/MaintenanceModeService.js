const guildSettingsManager =
    require(
        "../managers/GuildSettingsV2Manager"
    );

const fastAutocompleteResponseService =
    require(
        "../core/services/FastAutocompleteResponseService"
    );

const {
    deferPrivate
} = require(
    "../core/services/InteractionResponseService"
);

class MaintenanceModeService {
    async blockInteraction(interaction) {
        const guildId =
            interaction.guildId
            || interaction.guild?.id;

        if (
            !guildId
            || interaction.commandName ===
                "maintenance"
        ) {
            return false;
        }

        const maintenance =
            guildSettingsManager
                .getMaintenance(guildId);

        if (!maintenance.enabled) {
            return false;
        }

        if (
            typeof interaction.isAutocomplete ===
                "function"
            && interaction.isAutocomplete()
        ) {
            await fastAutocompleteResponseService
                .respond(
                    interaction,
                    []
                )
                .catch(() => null);

            return true;
        }

        await deferPrivate(interaction);

        await interaction.editReply({
            content:
                `🛠️ **GreyCore est en maintenance**\n${maintenance.message}`
        });

        return true;
    }
}

module.exports =
    new MaintenanceModeService();
