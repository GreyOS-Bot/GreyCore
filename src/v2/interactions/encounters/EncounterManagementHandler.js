const encounterManager =
    require(
        "../../managers/EncounterV2Manager"
    );

const dashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const encountersPage =
    require(
        "../../pages/character/CharacterEncountersPage"
    );

const modalFactory =
    require("./EncounterModalFactory");

const viewFactory =
    require("./EncounterViewFactory");

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

const {
    canManageCharacter,
    getEncounterName,
    isValidDate,
    readTextField
} = require("./EncounterUtils");

async function openManage(
    interaction,
    installationId
) {
    const dashboardData =
        getDashboard(
            interaction,
            installationId
        );

    if (!dashboardData) {
        return replyError(
            interaction,
            "❌ Personnage introuvable."
        );
    }

    if (
        !canManageCharacter(
            interaction,
            dashboardData.character
        )
    ) {
        return replyError(
            interaction,
            "❌ Tu ne peux pas gérer les rencontres de ce personnage."
        );
    }

    const installation=dashboardData.installation;
    const encounters=encounterManager.getForInstallationInContext(
        installation.id,interaction.guildId,installation.context_id
    );

    if (encounters.length === 0) {
        return replyError(
            interaction,
            "❌ Ce personnage ne possède aucune rencontre à gérer."
        );
    }

    return interaction.update(
        viewFactory.manageSelection({
            installationId: installation.id,
            encounters
        })
    );
}

async function openDetails(
    interaction,
    installationId,
    encounterId
) {
    const dashboardData =
        getDashboard(
            interaction,
            installationId
        );

    if (!dashboardData) {
        return replyError(
            interaction,
            "❌ Personnage introuvable."
        );
    }

    if (!canManageCharacter(interaction,dashboardData.character)) {
        return replyError(interaction,"❌ Tu ne peux pas consulter cette rencontre.");
    }

    const installation=dashboardData.installation;

    if (!installation) {
        return replyError(
            interaction,
            "❌ Continuité introuvable."
        );
    }

    let encounter;
    try { encounter=encounterManager.requireScopedEncounter(encounterId,{installationId:installation.id,guildId:interaction.guildId,contextId:installation.context_id,actorId:interaction.user.id}); } catch { encounter=null; }

    if (!encounter) {
        return replyError(
            interaction,
            "❌ Rencontre introuvable."
        );
    }

    return interaction.update(
        viewFactory.details({
            dashboardData,
            installationId: installation.id,
            encounter
        })
    );
}

async function openEdit(
    interaction,
    installationId,
    encounterId
) {
    const context =
        await resolveManagedEncounter(
            interaction,
            installationId,
            encounterId,
            "modifier"
        );

    if (!context) {
        return;
    }

    return interaction.showModal(
        modalFactory.edit(
            installationId,
            context.encounter
        )
    );
}

async function edit(
    interaction,
    installationId,
    encounterId
) {
    const context =
        await resolveManagedEncounter(
            interaction,
            installationId,
            encounterId,
            "modifier"
        );

    if (!context) {
        return;
    }

    let externalName;

    if (
        context.encounter
            .external_name
    ) {
        externalName =
            readTextField(
                interaction,
                "external_name"
            );

        if (!externalName) {
            return replyError(
                interaction,
                "❌ Le nom du personnage rencontré est obligatoire."
            );
        }
    }

    const location =
        readTextField(
            interaction,
            "location"
        );

    const occurredAt =
        readTextField(
            interaction,
            "occurred_at"
        );

    const note =
        readTextField(
            interaction,
            "note"
        );

    if (!isValidDate(occurredAt)) {
        return replyError(
            interaction,
            "❌ La date doit respecter le format `AAAA-MM-JJ`."
        );
    }

    try {
        encounterManager.updateScoped(
            encounterId,
            {installationId:context.installation.id,guildId:interaction.guildId,contextId:context.installation.context_id,actorId:interaction.user.id},
            {
                externalName:
                    context.encounter
                        .external_name
                        ? externalName
                        : undefined,
                location:
                    location
                    ||
                    null,
                note:
                    note
                    ||
                    null,
                occurredAt:
                    occurredAt
                    ||
                    null
            }
        );
    } catch (error) {
        return replyError(
            interaction,
            `❌ ${error.message}`
        );
    }

    return openDetails(
        interaction,
        installationId,
        encounterId
    );
}

async function confirmDelete(
    interaction,
    installationId,
    encounterId
) {
    const context =
        await resolveManagedEncounter(
            interaction,
            installationId,
            encounterId,
            "supprimer"
        );

    if (!context) {
        return;
    }

    let displayName =
        context.encounter
            .external_name;

    if (!displayName) {
        const displayEncounter = context.encounter;

        displayName =
            getEncounterName(
                displayEncounter,
                "ce personnage"
            );
    }

    return interaction.update(
        viewFactory
            .deleteConfirmation({
                installationId,
                encounterId,
                displayName
            })
    );
}

async function deleteEncounter(
    interaction,
    installationId,
    encounterId
) {
    const context =
        await resolveManagedEncounter(
            interaction,
            installationId,
            encounterId,
            "supprimer"
        );

    if (!context) {
        return;
    }

    try {
        encounterManager.deleteScoped(encounterId,{installationId:context.installation.id,
            guildId:interaction.guildId,contextId:context.installation.context_id,actorId:interaction.user.id});
    } catch (error) {
        return replyError(
            interaction,
            `❌ ${error.message}`
        );
    }

    return encountersPage.execute(
        interaction,
        installationId
    );
}

async function resolveManagedEncounter(
    interaction,
    installationId,
    encounterId,
    action
) {
    const dashboardData =
        getDashboard(
            interaction,
            installationId
        );

    if (
        !dashboardData
        ||
        !canManageCharacter(
            interaction,
            dashboardData.character
        )
    ) {
        await replyError(
            interaction,
            `❌ Tu ne peux pas ${action} cette rencontre.`
        );

        return null;
    }

    const encounter =
        encounterManager.getById(
            encounterId
        );

    if (!encounter) {
        await replyError(
            interaction,
            "❌ Rencontre introuvable."
        );

        return null;
    }

    const installation=dashboardData.installation;

    if (Number(encounter.installation_a_id)!==Number(installation.id)
        || String(encounter.guild_id)!==String(interaction.guildId)
        || String(encounter.context_id)!==String(installation.context_id)) {
        await replyError(
            interaction,
            "❌ Cette rencontre n’appartient pas à ce personnage."
        );

        return null;
    }

    return {
        installation,
        dashboardData,
        encounter
    };
}

function getDashboard(
    interaction,
    installationId
) {
    let installation;
    try { installation=encounterManager.requireInstallation(installationId); } catch { return null; }
    return dashboardManager.getPlayableDashboardData(installation.character_id,{guildId:interaction.guildId,
        continuityId:installation.continuity_id,installationId:installation.id});
}

module.exports = {
    confirmDelete,
    delete:
        deleteEncounter,
    edit,
    openDetails,
    openEdit,
    openManage
};
