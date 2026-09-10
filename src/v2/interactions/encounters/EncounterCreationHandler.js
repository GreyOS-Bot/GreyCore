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
    getContinuityId,
    isValidDate,
    readTextField
} = require("./EncounterUtils");

async function openAdd(
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
            "❌ Tu ne peux pas ajouter une rencontre à ce personnage."
        );
    }

    const installation = dashboardData.installation;

    if (!installation) {
        return replyError(
            interaction,
            "❌ Ce personnage ne possède aucune continuité installée sur ce serveur."
        );
    }

    const installedCharacters = encounterManager.getEligibleTargets(
        installation.id,interaction.guildId,installation.context_id
    );

    return interaction.update(
        viewFactory.addSelection({
            installationId: installation.id,
            installedCharacters
        })
    );
}

async function selectCharacter(
    interaction,
    installationId,
    selectedValue
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
            "❌ Tu ne peux pas ajouter une rencontre à ce personnage."
        );
    }

    const installationA = dashboardData.installation;

    if (!installationA) {
        return replyError(
            interaction,
            "❌ Continuité principale introuvable."
        );
    }

    if (
        selectedValue ===
        "external"
    ) {
        return openExternalModal(
            interaction,
            installationId,
            installationA.id
        );
    }

    let installationB;
    try {
        installationB = encounterManager.requireInstallation(selectedValue);
    } catch {
        return replyError(
            interaction,
            "❌ Le personnage rencontré est introuvable."
        );
    }

    if (String(installationB.guild_id)!==String(interaction.guildId)
        || String(installationB.context_id)!==String(installationA.context_id)
        || Number(installationB.id)===Number(installationA.id)) {
        return replyError(
            interaction,
            "❌ Un personnage ne peut pas se rencontrer lui-même."
        );
    }

    return openInternalModal(
        interaction,
        installationId,
        installationA.id,
        installationB.id
    );
}

async function openExternalModal(
    interaction,
    installationId,
    installationAId
) {
    return interaction.showModal(
        modalFactory.createExternal(
            installationAId
        )
    );
}

async function openInternalModal(
    interaction,
    installationId,
    installationAId,
    installationBId
) {
    return interaction.showModal(
        modalFactory.createInternal(
            installationAId,
            installationBId
        )
    );
}

async function createInternal(
    interaction,
    installationAId,
    installationBId
) {
    let installationA;
    try { installationA=encounterManager.requireInstallation(installationAId); encounterManager.requireInstallation(installationBId); } catch {
        return replyError(
            interaction,
            "❌ L’une des continuités est introuvable."
        );
    }

    const dashboardData =
        getDashboard(
            interaction,
            installationA.id
        );

    if (
        !dashboardData
        ||
        !canManageCharacter(
            interaction,
            dashboardData.character
        )
    ) {
        return replyError(
            interaction,
            "❌ Tu ne peux pas ajouter une rencontre à ce personnage."
        );
    }

    const fields =
        readEncounterFields(
            interaction
        );

    if (
        !isValidDate(
            fields.occurredAt
        )
    ) {
        return invalidDate(
            interaction
        );
    }

    try {
        encounterManager.create({
            guildId: interaction.guildId,
            contextId: installationA.context_id,
            installationAId,
            installationBId,
            externalName: null,
            location:
                fields.location
                ||
                null,
            note:
                fields.note
                ||
                null,
            occurredAt:
                fields.occurredAt
                ||
                null,
            createdBy:
                interaction.user.id
        });
    } catch (error) {
        return replyError(
            interaction,
            `❌ ${error.message}`
        );
    }

    return encountersPage.execute(
        interaction,
        installationA.id
    );
}

async function createExternal(
    interaction,
    installationAId
) {
    let installationA;
    try { installationA=encounterManager.requireInstallation(installationAId); } catch {
        return replyError(
            interaction,
            "❌ Continuité principale introuvable."
        );
    }

    const dashboardData =
        getDashboard(
            interaction,
            installationA.id
        );

    if (
        !dashboardData
        ||
        !canManageCharacter(
            interaction,
            dashboardData.character
        )
    ) {
        return replyError(
            interaction,
            "❌ Tu ne peux pas ajouter une rencontre à ce personnage."
        );
    }

    const externalName =
        readTextField(
            interaction,
            "external_name"
        );

    const fields =
        readEncounterFields(
            interaction
        );

    if (!externalName) {
        return replyError(
            interaction,
            "❌ Le nom du personnage rencontré est obligatoire."
        );
    }

    if (
        !isValidDate(
            fields.occurredAt
        )
    ) {
        return invalidDate(
            interaction
        );
    }

    try {
        encounterManager.create({
            guildId: interaction.guildId,
            contextId: installationA.context_id,
            installationAId,
            installationBId: null,
            externalName,
            location:
                fields.location
                ||
                null,
            note:
                fields.note
                ||
                null,
            occurredAt:
                fields.occurredAt
                ||
                null,
            createdBy:
                interaction.user.id
        });
    } catch (error) {
        return replyError(
            interaction,
            `❌ ${error.message}`
        );
    }

    return encountersPage.execute(
        interaction,
        installationA.id
    );
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

function readEncounterFields(
    interaction
) {
    return {
        location:
            readTextField(
                interaction,
                "location"
            ),
        occurredAt:
            readTextField(
                interaction,
                "occurred_at"
            ),
        note:
            readTextField(
                interaction,
                "note"
            )
    };
}

function invalidDate(interaction) {
    return replyError(
        interaction,
        "❌ La date doit respecter le format `AAAA-MM-JJ`."
    );
}

module.exports = {
    createExternal,
    createInternal,
    openAdd,
    openExternalModal,
    openInternalModal,
    selectCharacter
};
