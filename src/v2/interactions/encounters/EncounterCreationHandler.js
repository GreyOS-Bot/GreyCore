const encounterManager =
    require(
        "../../managers/EncounterV2Manager"
    );

const continuityManager =
    require(
        "../../managers/ContinuityV2Manager"
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
            "❌ Tu ne peux pas ajouter une rencontre à ce personnage."
        );
    }

    const continuityId =
        getContinuityId(
            dashboardData
        );

    if (!continuityId) {
        return replyError(
            interaction,
            "❌ Ce personnage ne possède aucune continuité installée sur ce serveur."
        );
    }

    const installedCharacters =
        dashboardManager
            .getInstalledCharactersForGuild(
                interaction.guildId
            )
            .filter(
                entry =>
                    String(
                        entry.characterId
                    ) !==
                        String(characterId)
                    &&
                    entry.continuity
            );

    return interaction.update(
        viewFactory.addSelection({
            characterId,
            installedCharacters
        })
    );
}

async function selectCharacter(
    interaction,
    characterId,
    selectedValue
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
            "❌ Tu ne peux pas ajouter une rencontre à ce personnage."
        );
    }

    const continuityAId =
        getContinuityId(
            dashboardData
        );

    if (!continuityAId) {
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
            characterId,
            continuityAId
        );
    }

    const otherDashboard =
        getDashboard(
            interaction,
            selectedValue
        );

    if (!otherDashboard) {
        return replyError(
            interaction,
            "❌ Le personnage rencontré est introuvable."
        );
    }

    const continuityBId =
        getContinuityId(
            otherDashboard
        );

    if (!continuityBId) {
        return replyError(
            interaction,
            "❌ La continuité du personnage rencontré est introuvable."
        );
    }

    if (
        String(continuityAId) ===
        String(continuityBId)
    ) {
        return replyError(
            interaction,
            "❌ Un personnage ne peut pas se rencontrer lui-même."
        );
    }

    return openInternalModal(
        interaction,
        characterId,
        continuityAId,
        continuityBId
    );
}

async function openExternalModal(
    interaction,
    characterId,
    continuityAId
) {
    return interaction.showModal(
        modalFactory.createExternal(
            continuityAId
        )
    );
}

async function openInternalModal(
    interaction,
    characterId,
    continuityAId,
    continuityBId
) {
    return interaction.showModal(
        modalFactory.createInternal(
            continuityAId,
            continuityBId
        )
    );
}

async function createInternal(
    interaction,
    continuityAId,
    continuityBId
) {
    const continuityA =
        continuityManager.getById(
            continuityAId
        );

    const continuityB =
        continuityManager.getById(
            continuityBId
        );

    if (
        !continuityA
        ||
        !continuityB
    ) {
        return replyError(
            interaction,
            "❌ L’une des continuités est introuvable."
        );
    }

    const dashboardData =
        getDashboard(
            interaction,
            continuityA.character_id,
            continuityA.id
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
            continuityAId,
            continuityBId,
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
        continuityA.character_id
    );
}

async function createExternal(
    interaction,
    continuityAId
) {
    const continuityA =
        continuityManager.getById(
            continuityAId
        );

    if (!continuityA) {
        return replyError(
            interaction,
            "❌ Continuité principale introuvable."
        );
    }

    const dashboardData =
        getDashboard(
            interaction,
            continuityA.character_id,
            continuityA.id
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
            continuityAId,
            continuityBId: null,
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
        continuityA.character_id
    );
}

function getDashboard(
    interaction,
    characterId,
    continuityId = null
) {
    return dashboardManager
        .getPlayableDashboardData(
            characterId,
            {
                guildId:
                    interaction.guildId,
                ...(continuityId
                    ? {
                        continuityId
                    }
                    : {})
            }
        );
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
