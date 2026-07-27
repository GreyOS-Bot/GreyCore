const repository =
    require(
        "../repositories/StateRepository"
    );

class StateV2Manager {

    getActiveStates(
        continuityId
    ) {
        return repository
            .getActive(
                continuityId
            );
    }

    getHistory(
        continuityId
    ) {
        return repository
            .getHistory(
                continuityId
            );
    }

    getById(
        stateId
    ) {
        return repository
            .getById(
                stateId
            );
    }

    hasActiveState(
        continuityId,
        stateTypeId
    ) {
        return repository
            .findActive(
                continuityId,
                stateTypeId
            );
    }

    create(
        data
    ) {
        if (
            this.hasActiveState(
                data.continuityId,
                data.stateTypeId
            )
        ) {
            throw new Error(
                "Cette continuité possède déjà cet état."
            );
        }

        if (
            !repository
                .getStateType(
                    data.stateTypeId,
                    data.guildId
                )
        ) {
            throw new Error(
                "Ce type d’état n’appartient pas à ce serveur."
            );
        }

        const createdBy =
            String(
                data.createdBy
                || ""
            ).trim();

        if (!createdBy) {
            throw new Error(
                "Le créateur de l’état est obligatoire."
            );
        }

        const now =
            new Date()
                .toISOString();

        return repository.insert({
            continuityId:
                data.continuityId,
            stateTypeId:
                data.stateTypeId,
            note:
                this.normalizeText(
                    data.note
                ),
            startedAt:
                this.normalizeDate(
                    data.startedAt,
                    now
                ),
            createdBy,
            createdAt:
                now,
            updatedAt:
                now
        });
    }

    end(
        stateId
    ) {
        const state =
            this.requireState(
                stateId
            );

        if (state.ended_at) {
            throw new Error(
                "Cet état est déjà terminé."
            );
        }

        return repository.end(
            stateId,
            new Date()
                .toISOString()
        );
    }

    delete(
        stateId
    ) {
        const state =
            this.requireState(
                stateId
            );

        repository.delete(
            stateId
        );

        return state;
    }

    updateState(
        stateId,
        {
            note,
            startedAt
        }
    ) {
        const state =
            this.requireState(
                stateId
            );

        return repository.update(
            stateId,
            {
                note:
                    this.normalizeText(
                        note
                    ),
                startedAt:
                    this.normalizeDate(
                        startedAt,
                        state.started_at
                    ),
                updatedAt:
                    new Date()
                        .toISOString()
            }
        );
    }

    deleteState(
        stateId
    ) {
        return this.delete(
            stateId
        );
    }

    requireState(
        stateId
    ) {
        const state =
            this.getById(
                stateId
            );

        if (!state) {
            throw new Error(
                "État introuvable."
            );
        }

        return state;
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
        value,
        fallback
    ) {
        if (!value) {
            return fallback;
        }

        const normalized =
            String(value)
                .trim();

        if (
            /^\d{4}-\d{2}-\d{2}$/
                .test(
                    normalized
                )
        ) {
            const date =
                new Date(
                    `${normalized}T00:00:00.000Z`
                );

            if (
                !Number.isNaN(
                    date.getTime()
                )
                && date
                    .toISOString()
                    .slice(
                        0,
                        10
                    ) === normalized
            ) {
                return normalized;
            }
        }

        throw new Error(
            "La date de début de l’état est invalide."
        );
    }

}

module.exports =
    new StateV2Manager();
