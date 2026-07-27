const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const relationshipManager =
    require(
        "../../managers/RelationshipV2Manager"
    );

const relationshipsPage =
    require(
        "../../pages/character/CharacterRelationshipsPage"
    );

const {
    canManageCharacter,
    getContinuityId,
    validDate,
    relationshipBelongsToContinuity
} = require("./RelationshipUtils");

const {
    createEditModal
} = require("./RelationshipModalFactory");

const {
    createManageSelection,
    createDetailsPage,
    createDeleteConfirmation
} = require("./RelationshipViewFactory");

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

function getDashboardData(
    interaction,
    characterId
) {
    return characterDashboardManager
        .getPlayableDashboardData(
            characterId,
            {
                guildId:
                    interaction.guildId
            }
        );
}

function getOwnedRelationship(
    dashboardData,
    relationshipId
) {
    const continuityId =
        getContinuityId(
            dashboardData
        );

    const relationship =
        relationshipManager.getById(
            relationshipId
        );

    return relationshipBelongsToContinuity(
        relationship,
        continuityId
    )
        ? relationship
        : null;
}

class RelationshipManagementHandler {

    async openManage(
        interaction,
        characterId
    ) {
        const dashboardData =
            getDashboardData(
                interaction,
                characterId
            );

        if (!dashboardData) {
            return replyError(
                interaction,
                "Personnage introuvable."
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
                "Tu ne peux pas gérer les relations de ce personnage."
            );
        }

        const continuityId =
            getContinuityId(
                dashboardData
            );

        const relationships =
            continuityId
                ? relationshipManager
                    .getDisplayRelationships(
                        continuityId
                    )
                : [];

        if (
            relationships.length === 0
        ) {
            return replyError(
                interaction,
                "Ce personnage ne possède aucune relation à gérer."
            );
        }

        return interaction.update(
            createManageSelection({
                characterId,
                relationships
            })
        );
    }

    async openDetails(
        interaction,
        characterId,
        relationshipId
    ) {
        const dashboardData =
            getDashboardData(
                interaction,
                characterId
            );

        if (!dashboardData) {
            return replyError(
                interaction,
                "Personnage introuvable."
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
                "Tu ne peux pas gérer les relations de ce personnage."
            );
        }

        const continuityId =
            getContinuityId(
                dashboardData
            );

        const relationship =
            relationshipManager
                .getDisplayRelationships(
                    continuityId
                )
                .find(item =>
                    String(item.id) ===
                    String(relationshipId)
                );

        if (!relationship) {
            return replyError(
                interaction,
                "Relation introuvable."
            );
        }

        return interaction.update(
            createDetailsPage({
                characterId,
                relationshipId,
                dashboardData,
                relationship
            })
        );
    }

    async openEdit(
        interaction,
        characterId,
        relationshipId
    ) {
        const dashboardData =
            getDashboardData(
                interaction,
                characterId
            );

        if (
            !dashboardData
            || !canManageCharacter(
                interaction,
                dashboardData.character
            )
        ) {
            return replyError(
                interaction,
                "Tu ne peux pas modifier cette relation."
            );
        }

        const relationship =
            getOwnedRelationship(
                dashboardData,
                relationshipId
            );

        if (!relationship) {
            return replyError(
                interaction,
                "Relation introuvable."
            );
        }

        return interaction.showModal(
            createEditModal({
                characterId,
                relationshipId,
                relationship
            })
        );
    }

    async edit(
        interaction,
        characterId,
        relationshipId
    ) {
        const dashboardData =
            getDashboardData(
                interaction,
                characterId
            );

        if (
            !dashboardData
            || !canManageCharacter(
                interaction,
                dashboardData.character
            )
        ) {
            return replyError(
                interaction,
                "Tu ne peux pas modifier cette relation."
            );
        }

        const relationship =
            getOwnedRelationship(
                dashboardData,
                relationshipId
            );

        if (!relationship) {
            return replyError(
                interaction,
                "Relation introuvable."
            );
        }

        const note =
            interaction.fields
                .getTextInputValue(
                    "note"
                )
                .trim();

        const startedAt =
            interaction.fields
                .getTextInputValue(
                    "started_at"
                )
                .trim();

        if (!validDate(startedAt)) {
            return replyError(
                interaction,
                "La date doit respecter le format `AAAA-MM-JJ`."
            );
        }

        try {
            relationshipManager.update(
                relationshipId,
                {
                    note:
                        note || null,
                    startedAt:
                        startedAt || null
                }
            );
        } catch (error) {
            return replyError(
                interaction,
                error
            );
        }

        return this.openDetails(
            interaction,
            characterId,
            relationshipId
        );
    }

    async confirmDelete(
        interaction,
        characterId,
        relationshipId
    ) {
        const dashboardData =
            getDashboardData(
                interaction,
                characterId
            );

        if (
            !dashboardData
            || !canManageCharacter(
                interaction,
                dashboardData.character
            )
        ) {
            return replyError(
                interaction,
                "Tu ne peux pas supprimer cette relation."
            );
        }

        const relationship =
            getOwnedRelationship(
                dashboardData,
                relationshipId
            );

        if (!relationship) {
            return replyError(
                interaction,
                "Relation introuvable."
            );
        }

        return interaction.update(
            createDeleteConfirmation({
                characterId,
                relationshipId,
                relationship
            })
        );
    }

    async delete(
        interaction,
        characterId,
        relationshipId
    ) {
        const dashboardData =
            getDashboardData(
                interaction,
                characterId
            );

        if (
            !dashboardData
            || !canManageCharacter(
                interaction,
                dashboardData.character
            )
        ) {
            return replyError(
                interaction,
                "Tu ne peux pas supprimer cette relation."
            );
        }

        const relationship =
            getOwnedRelationship(
                dashboardData,
                relationshipId
            );

        if (!relationship) {
            return replyError(
                interaction,
                "Relation introuvable."
            );
        }

        try {
            relationshipManager.delete(
                relationshipId
            );
        } catch (error) {
            return replyError(
                interaction,
                error
            );
        }

        return relationshipsPage.execute(
            interaction,
            characterId
        );
    }
}

const relationshipManagementHandler =
    new RelationshipManagementHandler();

module.exports = {
    openManage:
        relationshipManagementHandler
            .openManage
            .bind(
                relationshipManagementHandler
            ),
    openDetails:
        relationshipManagementHandler
            .openDetails
            .bind(
                relationshipManagementHandler
            ),
    openEdit:
        relationshipManagementHandler
            .openEdit
            .bind(
                relationshipManagementHandler
            ),
    edit:
        relationshipManagementHandler
            .edit
            .bind(
                relationshipManagementHandler
            ),
    confirmDelete:
        relationshipManagementHandler
            .confirmDelete
            .bind(
                relationshipManagementHandler
            ),
    delete:
        relationshipManagementHandler
            .delete
            .bind(
                relationshipManagementHandler
            )
};
