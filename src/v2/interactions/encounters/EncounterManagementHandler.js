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
    belongsToContinuity,
    canManageCharacter,
    getContinuityId,
    getEncounterName,
    isValidDate,
    readTextField
} = require("./EncounterUtils");

async function openManage(
    interaction,
    characterId
) {
    const dashboardData =
        getDashboard(
            interaction,
            characterId
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

    const continuityId =
        getContinuityId(
            dashboardData
        );

    const encounters =
        continuityId
            ? encounterManager
                .getForContinuity(
                    continuityId
                )
            : [];

    if (encounters.length === 0) {
        return replyError(
            interaction,
            "❌ Ce personnage ne possède aucune rencontre à gérer."
        );
    }

    return interaction.update(
        viewFactory.manageSelection({
            characterId,
            encounters
        })
    );
}

async function openDetails(
    interaction,
    characterId,
    encounterId
) {
    const dashboardData =
        getDashboard(
            interaction,
            characterId
        );

    if (!dashboardData) {
        return replyError(
            interaction,
            "❌ Personnage introuvable."
        );
    }

    const continuityId =
        getContinuityId(
            dashboardData
        );

    if (!continuityId) {
        return replyError(
            interaction,
            "❌ Continuité introuvable."
        );
    }

    const encounter =
        encounterManager
            .getForContinuity(
                continuityId
            )
            .find(
                item =>
                    String(item.id) ===
                    String(encounterId)
            );

    if (!encounter) {
        return replyError(
            interaction,
            "❌ Rencontre introuvable."
        );
    }

    return interaction.update(
        viewFactory.details({
            dashboardData,
            characterId,
            encounter
        })
    );
}

async function openEdit(
    interaction,
    characterId,
    encounterId
) {
    const context =
        await resolveManagedEncounter(
            interaction,
            characterId,
            encounterId,
            "modifier"
        );

    if (!context) {
        return;
    }

    return interaction.showModal(
        modalFactory.edit(
            characterId,
            context.encounter
        )
    );
}

async function edit(
    interaction,
    characterId,
    encounterId
) {
    const context =
        await resolveManagedEncounter(
            interaction,
            characterId,
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
        encounterManager.update(
            encounterId,
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
        characterId,
        encounterId
    );
}

async function confirmDelete(
    interaction,
    characterId,
    encounterId
) {
    const context =
        await resolveManagedEncounter(
            interaction,
            characterId,
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
        const displayEncounter =
            encounterManager
                .getForContinuity(
                    context.continuityId
                )
                .find(
                    item =>
                        String(item.id) ===
                        String(encounterId)
                );

        displayName =
            getEncounterName(
                displayEncounter,
                "ce personnage"
            );
    }

    return interaction.update(
        viewFactory
            .deleteConfirmation({
                characterId,
                encounterId,
                displayName
            })
    );
}

async function deleteEncounter(
    interaction,
    characterId,
    encounterId
) {
    const context =
        await resolveManagedEncounter(
            interaction,
            characterId,
            encounterId,
            "supprimer"
        );

    if (!context) {
        return;
    }

    try {
        encounterManager.delete(
            encounterId
        );
    } catch (error) {
        return replyError(
            interaction,
            `❌ ${error.message}`
        );
    }

    return encountersPage.execute(
        interaction,
        characterId
    );
}

async function resolveManagedEncounter(
    interaction,
    characterId,
    encounterId,
    action
) {
    const dashboardData =
        getDashboard(
            interaction,
            characterId
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

    const continuityId =
        getContinuityId(
            dashboardData
        );

    if (
        !belongsToContinuity(
            encounter,
            continuityId
        )
    ) {
        await replyError(
            interaction,
            "❌ Cette rencontre n’appartient pas à ce personnage."
        );

        return null;
    }

    return {
        continuityId,
        dashboardData,
        encounter
    };
}

function getDashboard(
    interaction,
    characterId
) {
    return dashboardManager
        .getPlayableDashboardData(
            characterId,
            {
                guildId:
                    interaction.guildId
            }
        );
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
