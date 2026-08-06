const continuityManager =
    require(
        "../../managers/ContinuityV2Manager"
    );

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
    resolveRelationshipGuildId,
    validDate
} = require("./RelationshipUtils");

const {
    sendRequestNotification,
    notifyRequester
} = require(
    "./RelationshipNotificationService"
);

const {
    createSearchModal,
    createRelationshipModal
} = require("./RelationshipModalFactory");

const relationshipModalContextManager =
    require(
        "../../managers/RelationshipModalContextManager"
    );

const {
    createSearchResults,
    createTypeSelection,
    createMissingTypeInformation
} = require("./RelationshipViewFactory");

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

class RelationshipCreationHandler {

    async openAdd(
        interaction,
        characterId
    ) {
        const guildId =
            resolveRelationshipGuildId(
                interaction,
                characterId
            );

        if (!guildId) {
            return replyError(
                interaction,
                "Ouvre cette fiche depuis le serveur où le personnage est installé pour ajouter une relation."
            );
        }

        const dashboardData =
            characterDashboardManager
                .getInstalledDashboardData(
                    characterId,
                    {
                        guildId:
                            guildId
                    }
                );

        if (!dashboardData) {
            return replyError(
                interaction,
                "Personnage introuvable."
            );
        }

        const {
            character,
            continuity
        } = dashboardData;

        if (
            !canManageCharacter(
                interaction,
                character
            )
        ) {
            return replyError(
                interaction,
                "Tu ne peux pas modifier les relations de ce personnage."
            );
        }

        if (!continuity) {
            return replyError(
                interaction,
                "Ce personnage ne possède aucune continuité installée sur ce serveur."
            );
        }

        return interaction.showModal(
            createSearchModal(
                characterId
            )
        );
    }

    async search(
        interaction,
        characterId
    ) {
        const guildId =
            resolveRelationshipGuildId(
                interaction,
                characterId
            );

        if (!guildId) {
            return replyError(
                interaction,
                "Ouvre cette fiche depuis le serveur concerné pour rechercher une relation."
            );
        }

        const dashboardData =
            characterDashboardManager
                .getInstalledDashboardData(
                    characterId,
                    {
                        guildId:
                            guildId
                    }
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
                "Tu ne peux pas modifier les relations de ce personnage."
            );
        }

        const query =
            interaction.fields
                .getTextInputValue(
                    "query"
                )
                .trim();

        const availableCharacters =
            characterDashboardManager
                .searchInstalledCharactersForGuild(
                    guildId,
                    query,
                    {
                        excludeCharacterId:
                            characterId,
                        limit:
                            25
                    }
                )
                .map(entry => ({
                    ...entry,
                    ownerDisplayName:
                        interaction.guild?.members
                            ?.cache
                            ?.get(
                                entry.character
                                    .discord_user_id
                            )
                            ?.displayName
                        || entry.character
                            .discord_user_id
                        || "Utilisateur inconnu"
                }));

        if (
            availableCharacters.length ===
            0
        ) {
            return replyPrivate(
                interaction,
                `🔎 Aucun personnage jouable trouvé pour **${query}**.`
            );
        }

        return replyPrivate(
            interaction,
            createSearchResults({
                characterId,
                query,
                availableCharacters
            })
        );
    }

    async selectCharacter(
        interaction,
        characterId,
        otherCharacterId
    ) {
        const guildId =
            resolveRelationshipGuildId(
                interaction,
                characterId
            );

        if (!guildId) {
            return replyError(
                interaction,
                "Serveur de la relation introuvable. Ouvre la fiche depuis le serveur concerné."
            );
        }

        const relationshipTypes =
            relationshipManager.getTypes(
                guildId
            );

        if (
            relationshipTypes.length === 0
        ) {
            return interaction.update(
                createMissingTypeInformation(
                    characterId
                )
            );
        }

        return interaction.update(
            createTypeSelection({
                characterId,
                otherCharacterId,
                relationshipTypes
            })
        );
    }

    async selectType(
        interaction,
        characterId,
        otherCharacterId,
        relationshipTypeId
    ) {
        const guildId =
            resolveRelationshipGuildId(
                interaction,
                characterId
            );

        if (!guildId) {
            return replyError(
                interaction,
                "Serveur de la relation introuvable. Ouvre la fiche depuis le serveur concerné."
            );
        }

        const dashboardA =
            characterDashboardManager
                .getInstalledDashboardData(
                    characterId,
                    {
                        guildId:
                            guildId
                    }
                );

        const dashboardB =
            characterDashboardManager
                .getInstalledDashboardData(
                    otherCharacterId,
                    {
                        guildId:
                            guildId
                    }
                );

        if (
            !dashboardA
            || !dashboardB
        ) {
            return replyError(
                interaction,
                "L’un des personnages est introuvable."
            );
        }

        if (
            !canManageCharacter(
                interaction,
                dashboardA.character
            )
        ) {
            return replyError(
                interaction,
                "Tu ne peux pas ajouter une relation à ce personnage."
            );
        }

        const continuityAId =
            getContinuityId(
                dashboardA
            );

        const continuityBId =
            getContinuityId(
                dashboardB
            );

        if (
            !continuityAId
            || !continuityBId
        ) {
            return replyError(
                interaction,
                "Une continuité est introuvable."
            );
        }

        const contextId =
            relationshipModalContextManager.create({
                userId:
                    interaction.user.id,
                guildId:
                    guildId,
                continuityAId,
                continuityBId,
                relationshipTypeId
            });

        return interaction.showModal(
            createRelationshipModal({
                contextId
            })
        );
    }

    async selectTypePage(
        interaction,
        characterId,
        otherCharacterId,
        page
    ) {
        const guildId =
            resolveRelationshipGuildId(
                interaction,
                characterId
            );

        if (!guildId) {
            return replyError(
                interaction,
                "Serveur de la relation introuvable. Ouvre la fiche depuis le serveur concerné."
            );
        }

        const dashboardData =
            characterDashboardManager
                .getInstalledDashboardData(
                    characterId,
                    {
                        guildId:
                            guildId
                    }
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
                "Tu ne peux pas modifier les relations de ce personnage."
            );
        }

        return interaction.update(
            createTypeSelection({
                characterId,
                otherCharacterId,
                relationshipTypes:
                    relationshipManager.getTypes(
                        guildId
                    ),
                page
            })
        );
    }

    async createFromContext(
        interaction,
        contextId
    ) {
        const context =
            relationshipModalContextManager.consume(
                contextId,
                {
                    userId:
                        interaction.user.id,
                    guildId:
                        interaction.guildId
                }
            );

        return this.create(
            interaction,
            context.continuityAId,
            context.continuityBId,
            context.relationshipTypeId,
            context.guildId
        );
    }

    async create(
        interaction,
        continuityAId,
        continuityBId,
        relationshipTypeId,
        relationshipGuildId = null
    ) {
        const guildId =
            relationshipGuildId
            || interaction.guildId;

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
            || !continuityB
        ) {
            return replyError(
                interaction,
                "L’une des continuités est introuvable."
            );
        }

        const dashboardA =
            characterDashboardManager
                .getInstalledDashboardData(
                    continuityA.character_id,
                    {
                        guildId:
                            guildId,
                        continuityId:
                            continuityA.id
                    }
                );

        const dashboardB =
            characterDashboardManager
                .getInstalledDashboardData(
                    continuityB.character_id,
                    {
                        guildId:
                            guildId,
                        continuityId:
                            continuityB.id
                    }
                );

        if (
            !dashboardA
            || !dashboardB
        ) {
            return replyError(
                interaction,
                "L’un des personnages est introuvable."
            );
        }

        if (
            !canManageCharacter(
                interaction,
                dashboardA.character
            )
        ) {
            return replyError(
                interaction,
                "Tu ne peux pas ajouter une relation à ce personnage."
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

        const sameOwner =
            String(
                dashboardA.character
                    .discord_user_id
            ) ===
            String(
                dashboardB.character
                    .discord_user_id
            );

        if (sameOwner) {
            try {
                relationshipManager.create({
                    guildId:
                        guildId,
                    characterAId:
                        continuityA.character_id,
                    continuityAId:
                        continuityA.id,
                    characterBId:
                        continuityB.character_id,
                    continuityBId:
                        continuityB.id,
                    relationshipTypeId:
                        Number(
                            relationshipTypeId
                        ),
                    note:
                        note || null,
                    startedAt:
                        startedAt || null,
                    createdBy:
                        interaction.user.id
                });
            } catch (error) {
                return replyError(
                    interaction,
                    error
                );
            }

            return relationshipsPage
                .execute(
                    interaction,
                    continuityA
                        .character_id
                );
        }

        let request;

        try {
            request =
                relationshipManager
                    .createRequest({
                        guildId:
                            guildId,
                        requesterContinuityId:
                            continuityA.id,
                        targetContinuityId:
                            continuityB.id,
                        relationshipTypeId:
                            Number(
                                relationshipTypeId
                            ),
                        requestedBy:
                            interaction.user.id,
                        targetOwnerId:
                            dashboardB.character
                                .discord_user_id,
                        note:
                            note || null,
                        startedAt:
                            startedAt || null
                    });

            await sendRequestNotification(
                interaction.client,
                request
            );
        } catch (error) {
            if (request?.id) {
                relationshipManager
                    .cancelPendingRequest(
                        request.id
                    );
            }

            const notificationFailed =
                request?.id;

            return replyError(
                interaction,
                    notificationFailed
                        ? "La demande n’a pas été créée car le propriétaire ne peut pas recevoir de message privé."
                        : error.message
            );
        }

        return replyPrivate(
            interaction,
                `💌 Demande envoyée au propriétaire de **${request.target_character_name}**.\n`
                + "La relation ne sera créée qu’après son acceptation."
        );
    }

    async acceptRequest(
        interaction,
        requestId
    ) {
        let result;

        try {
            result =
                relationshipManager
                    .acceptRequest(
                        Number(requestId),
                        interaction.user.id
                    );
        } catch (error) {
            return replyError(
                interaction,
                error
            );
        }

        await interaction.update({
            content:
                `✅ Relation acceptée entre **${result.request.requester_character_name}** et **${result.request.target_character_name}**.`,
            embeds:
                [],
            components:
                []
        });

        await notifyRequester(
            interaction.client,
            result.request,
            true
        );
    }

    async rejectRequest(
        interaction,
        requestId
    ) {
        let request;

        try {
            request =
                relationshipManager
                    .rejectRequest(
                        Number(requestId),
                        interaction.user.id
                    );
        } catch (error) {
            return replyError(
                interaction,
                error
            );
        }

        await interaction.update({
            content:
                `❌ Demande refusée pour **${request.target_character_name}**.`,
            embeds:
                [],
            components:
                []
        });

        await notifyRequester(
            interaction.client,
            request,
            false
        );
    }
}

const relationshipCreationHandler =
    new RelationshipCreationHandler();

module.exports = {
    openAdd:
        relationshipCreationHandler
            .openAdd
            .bind(
                relationshipCreationHandler
            ),
    search:
        relationshipCreationHandler
            .search
            .bind(
                relationshipCreationHandler
            ),
    selectCharacter:
        relationshipCreationHandler
            .selectCharacter
            .bind(
                relationshipCreationHandler
            ),
    selectType:
        relationshipCreationHandler
            .selectType
            .bind(
                relationshipCreationHandler
            ),
    selectTypePage:
        relationshipCreationHandler
            .selectTypePage
            .bind(
                relationshipCreationHandler
            ),
    createFromContext:
        relationshipCreationHandler
            .createFromContext
            .bind(
                relationshipCreationHandler
            ),
    create:
        relationshipCreationHandler
            .create
            .bind(
                relationshipCreationHandler
            ),
    acceptRequest:
        relationshipCreationHandler
            .acceptRequest
            .bind(
                relationshipCreationHandler
            ),
    rejectRequest:
        relationshipCreationHandler
            .rejectRequest
            .bind(
                relationshipCreationHandler
            )
};
