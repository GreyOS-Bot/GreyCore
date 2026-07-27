const typeRepository =
    require(
        "../repositories/RelationshipTypeRepository"
    );

const relationshipRepository =
    require(
        "../repositories/RelationshipRepository"
    );

const requestRepository =
    require(
        "../repositories/RelationshipRequestRepository"
    );

const unitOfWork =
    require(
        "../repositories/RelationshipUnitOfWork"
    );

class RelationshipV2Manager {

    getTypes(
        guildId
    ) {
        return typeRepository
            .getByGuild(
                guildId
            );
    }

    getTypeById(
        guildId,
        relationshipTypeId
    ) {
        return typeRepository
            .getById(
                guildId,
                relationshipTypeId
            );
    }

    getById(
        relationshipId
    ) {
        return relationshipRepository
            .getById(
                relationshipId
            );
    }

    getForContinuity(
        continuityId
    ) {
        return relationshipRepository
            .getForContinuity(
                continuityId
            );
    }

    getDisplayRelationships(
        continuityId
    ) {
        return this
            .getForContinuity(
                continuityId
            )
            .map(
                relationship =>
                    this
                        .toDisplayRelationship(
                            relationship,
                            continuityId
                        )
            );
    }

    hasActiveRelationship(
        context
    ) {
        return relationshipRepository
            .findActive(
                context
            );
    }

    getRequestById(
        requestId
    ) {
        return requestRepository
            .getById(
                requestId
            );
    }

    hasPendingRequest(
        context
    ) {
        return requestRepository
            .findPending(
                context
            );
    }

    createRequest(
        data
    ) {
        const requesterContinuityId =
            this.requireIdentifier(
                data.requesterContinuityId,
                "La continuité demandant la relation est obligatoire."
            );

        const targetContinuityId =
            this.requireIdentifier(
                data.targetContinuityId,
                "La continuité ciblée est obligatoire."
            );

        if (
            requesterContinuityId ===
            targetContinuityId
        ) {
            throw new Error(
                "Un personnage ne peut pas demander une relation avec lui-même."
            );
        }

        this.requireType(
            data.guildId,
            data.relationshipTypeId
        );

        const relationshipContext = {
            continuityAId:
                requesterContinuityId,
            continuityBId:
                targetContinuityId,
            relationshipTypeId:
                data.relationshipTypeId
        };

        if (
            this.hasActiveRelationship(
                relationshipContext
            )
        ) {
            throw new Error(
                "Cette relation existe déjà."
            );
        }

        if (
            this.hasPendingRequest(
                relationshipContext
            )
        ) {
            throw new Error(
                "Une demande identique est déjà en attente."
            );
        }

        return requestRepository
            .insert({
                requesterContinuityId,
                targetContinuityId,
                relationshipTypeId:
                    data.relationshipTypeId,
                requestedBy:
                    this.requireIdentifier(
                        data.requestedBy,
                        "Le propriétaire demandeur est obligatoire."
                    ),
                targetOwnerId:
                    this.requireIdentifier(
                        data.targetOwnerId,
                        "Le propriétaire ciblé est obligatoire."
                    ),
                note:
                    this.normalizeText(
                        data.note
                    ),
                startedAt:
                    this.normalizeDate(
                        data.startedAt
                    ),
                createdAt:
                    new Date()
                        .toISOString()
            });
    }

    acceptRequest(
        requestId,
        respondedBy
    ) {
        return unitOfWork.run(
            () => {
                const request =
                    this.requirePendingRequest(
                        requestId
                    );

                this.requireTargetOwner(
                    request,
                    respondedBy,
                    "accepter"
                );

                const relationship =
                    this.create({
                        guildId:
                            request.guild_id,
                        characterAId:
                            request
                                .requester_character_id,
                        continuityAId:
                            request
                                .requester_continuity_id,
                        characterBId:
                            request
                                .target_character_id,
                        continuityBId:
                            request
                                .target_continuity_id,
                        relationshipTypeId:
                            request
                                .relationship_type_id,
                        note:
                            request.note,
                        startedAt:
                            request.started_at,
                        createdBy:
                            request.requested_by
                    });

                return {
                    request:
                        requestRepository
                            .respond(
                                request.id,
                                "accepted",
                                respondedBy,
                                new Date()
                                    .toISOString()
                            ),
                    relationship
                };
            }
        );
    }

    rejectRequest(
        requestId,
        respondedBy
    ) {
        return unitOfWork.run(
            () => {
                const request =
                    this.requirePendingRequest(
                        requestId
                    );

                this.requireTargetOwner(
                    request,
                    respondedBy,
                    "refuser"
                );

                return requestRepository
                    .respond(
                        request.id,
                        "rejected",
                        respondedBy,
                        new Date()
                            .toISOString()
                    );
            }
        );
    }

    cancelPendingRequest(
        requestId
    ) {
        const request =
            this.getRequestById(
                requestId
            );

        if (
            request
            && request.status ===
                "pending"
        ) {
            requestRepository
                .deletePending(
                    requestId
                );
        }

        return request
        || null;
    }

    create(
        data
    ) {
        const characterAId =
            this.requireIdentifier(
                data.characterAId,
                "Le premier personnage est obligatoire."
            );

        const characterBId =
            this.requireIdentifier(
                data.characterBId,
                "Le second personnage est obligatoire."
            );

        const continuityAId =
            this.requireIdentifier(
                data.continuityAId,
                "La première continuité est obligatoire."
            );

        const continuityBId =
            this.requireIdentifier(
                data.continuityBId,
                "La seconde continuité est obligatoire."
            );

        if (
            characterAId ===
            characterBId
        ) {
            throw new Error(
                "Un personnage ne peut pas avoir une relation avec lui-même."
            );
        }

        if (
            continuityAId ===
            continuityBId
        ) {
            throw new Error(
                "Une continuité ne peut pas avoir une relation avec elle-même."
            );
        }

        this.requireType(
            data.guildId,
            data.relationshipTypeId
        );

        if (
            this.hasActiveRelationship({
                continuityAId,
                continuityBId,
                relationshipTypeId:
                    data.relationshipTypeId
            })
        ) {
            throw new Error(
                "Cette relation existe déjà."
            );
        }

        const now =
            new Date()
                .toISOString();

        return relationshipRepository
            .insert({
                guildId:
                    this.requireIdentifier(
                        data.guildId,
                        "Le serveur est obligatoire."
                    ),
                characterAId,
                continuityAId,
                characterBId,
                continuityBId,
                relationshipTypeId:
                    data.relationshipTypeId,
                note:
                    this.normalizeText(
                        data.note
                    ),
                startedAt:
                    this.normalizeDate(
                        data.startedAt
                    ),
                createdBy:
                    this.requireIdentifier(
                        data.createdBy,
                        "Le créateur de la relation est obligatoire."
                    ),
                createdAt:
                    now,
                updatedAt:
                    now
            });
    }

    update(
        relationshipId,
        {
            note,
            startedAt
        }
    ) {
        this.requireRelationship(
            relationshipId
        );

        return relationshipRepository
            .update(
                relationshipId,
                {
                    note:
                        this.normalizeText(
                            note
                        ),
                    startedAt:
                        this.normalizeDate(
                            startedAt
                        ),
                    updatedAt:
                        new Date()
                            .toISOString()
                }
            );
    }

    end(
        relationshipId
    ) {
        const relationship =
            this.requireRelationship(
                relationshipId
            );

        if (
            relationship
                .ended_at
        ) {
            throw new Error(
                "Cette relation est déjà terminée."
            );
        }

        return relationshipRepository
            .end(
                relationshipId,
                new Date()
                    .toISOString()
            );
    }

    delete(
        relationshipId
    ) {
        const relationship =
            this.requireRelationship(
                relationshipId
            );

        relationshipRepository
            .delete(
                relationshipId
            );

        return relationship;
    }

    toDisplayRelationship(
        relationship,
        continuityId
    ) {
        const isCharacterA =
            String(
                relationship
                    .continuity_a_id
            ) === String(
                continuityId
            );

        return {
            ...relationship,
            otherCharacterId:
                isCharacterA
                    ? relationship
                        .character_b_id
                    : relationship
                        .character_a_id,
            otherContinuityId:
                isCharacterA
                    ? relationship
                        .continuity_b_id
                    : relationship
                        .continuity_a_id,
            otherCharacterName:
                isCharacterA
                    ? relationship
                        .character_b_name
                    : relationship
                        .character_a_name,
            displayLabel:
                isCharacterA
                    ? relationship
                        .label_a_to_b
                    : relationship
                        .label_b_to_a
        };
    }

    requireType(
        guildId,
        relationshipTypeId
    ) {
        const type =
            this.getTypeById(
                guildId,
                relationshipTypeId
            );

        if (!type) {
            throw new Error(
                "Type de relation introuvable sur ce serveur."
            );
        }

        return type;
    }

    requireRelationship(
        relationshipId
    ) {
        const relationship =
            this.getById(
                relationshipId
            );

        if (!relationship) {
            throw new Error(
                "Relation introuvable."
            );
        }

        return relationship;
    }

    requirePendingRequest(
        requestId
    ) {
        const request =
            this.getRequestById(
                requestId
            );

        if (!request) {
            throw new Error(
                "Demande de relation introuvable."
            );
        }

        if (
            request.status !==
            "pending"
        ) {
            throw new Error(
                "Cette demande a déjà été traitée."
            );
        }

        return request;
    }

    requireTargetOwner(
        request,
        respondedBy,
        action
    ) {
        if (
            String(
                request
                    .target_owner_id
            ) !== String(
                respondedBy
            )
            || String(
                request
                    .current_target_owner_id
            ) !== String(
                respondedBy
            )
        ) {
            throw new Error(
                `Seul le propriétaire du personnage peut ${action} cette demande.`
            );
        }
    }

    requireIdentifier(
        value,
        errorMessage
    ) {
        const normalized =
            String(
                value
                || ""
            ).trim();

        if (!normalized) {
            throw new Error(
                errorMessage
            );
        }

        return normalized;
    }

    normalizeText(
        value
    ) {
        return String(
            value
            || ""
        ).trim()
        || null;
    }

    normalizeDate(
        value
    ) {
        if (!value) {
            return null;
        }

        const normalized =
            String(value)
                .trim();

        const date =
            new Date(
                `${normalized}T00:00:00.000Z`
            );

        if (
            !/^\d{4}-\d{2}-\d{2}$/
                .test(
                    normalized
                )
            || Number.isNaN(
                date.getTime()
            )
            || date
                .toISOString()
                .slice(
                    0,
                    10
                ) !== normalized
        ) {
            throw new Error(
                "La date de début de la relation est invalide."
            );
        }

        return normalized;
    }

}

module.exports =
    new RelationshipV2Manager();
