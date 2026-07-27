const guildModuleManager =
    require("../../managers/GuildModuleV2Manager");

const guildManagementPolicy =
    require("../../core/policies/GuildManagementPolicy");

const view =
    require("../../views/settings/GuildModulesView");

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

async function open(interaction) {
    if (
        !guildManagementPolicy.canManage(interaction)
    ) {
        await replyError(
            interaction,
            "Seules les personnes autorisées à gérer le serveur peuvent modifier les modules."
        );

        return;
    }

    return replyPrivate(
        interaction,
        view.build(
            guildModuleManager.getConfiguration(
                interaction.guildId
            )
        )
    );
}

async function toggle(interaction) {
    if (
        !guildManagementPolicy.canManage(interaction)
    ) {
        await replyError(
            interaction,
            "Seules les personnes autorisées à gérer le serveur peuvent modifier les modules."
        );

        return;
    }

    const moduleKey = interaction.values[0];
    const module = guildModuleManager.getModule(moduleKey);

    if (!module) {
        throw new Error("Module inconnu.");
    }

    const current = guildModuleManager.isEnabled(
        interaction.guildId,
        moduleKey
    );

    guildModuleManager.setEnabled(
        interaction.guildId,
        moduleKey,
        !current
    );

    return interaction.update(
        view.build(
            guildModuleManager.getConfiguration(
                interaction.guildId
            )
        )
    );
}

module.exports = {
    open,
    toggle
};
