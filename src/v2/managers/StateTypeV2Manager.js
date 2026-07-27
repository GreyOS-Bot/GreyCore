const repository =
    require(
        "../repositories/StateTypeRepository"
    );

const DEFAULT_STATE_TYPES =
    Object.freeze([
        {
            name:
                "Blessé·e",
            emoji:
                "🩹",
            color:
                "#E67E22"
        },
        {
            name:
                "Gravement blessé·e",
            emoji:
                "🩸",
            color:
                "#C0392B"
        },
        {
            name:
                "Hospitalisé·e",
            emoji:
                "🏥",
            color:
                "#3498DB"
        },
        {
            name:
                "En convalescence",
            emoji:
                "🛏️",
            color:
                "#95A5A6"
        },
        {
            name:
                "Malade",
            emoji:
                "🤒",
            color:
                "#2ECC71"
        },
        {
            name:
                "Inconscient·e",
            emoji:
                "😵",
            color:
                "#34495E"
        },
        {
            name:
                "Enceinte",
            emoji:
                "🤰",
            color:
                "#E91E63"
        },
        {
            name:
                "Fatigué·e",
            emoji:
                "😴",
            color:
                "#7F8C8D"
        },
        {
            name:
                "Ivre",
            emoji:
                "🍺",
            color:
                "#F39C12"
        },
        {
            name:
                "Sous substances",
            emoji:
                "💊",
            color:
                "#9B59B6"
        },
        {
            name:
                "Traumatisé·e",
            emoji:
                "🫥",
            color:
                "#5D6D7E"
        },
        {
            name:
                "En deuil",
            emoji:
                "🕯️",
            color:
                "#2C3E50"
        },
        {
            name:
                "Amnésique",
            emoji:
                "❔",
            color:
                "#8E44AD"
        },
        {
            name:
                "Disparu·e",
            emoji:
                "🔍",
            color:
                "#616A6B"
        },
        {
            name:
                "Recherché·e",
            emoji:
                "🚨",
            color:
                "#E74C3C"
        },
        {
            name:
                "En garde à vue",
            emoji:
                "🚔",
            color:
                "#2980B9"
        },
        {
            name:
                "Emprisonné·e",
            emoji:
                "⛓️",
            color:
                "#566573"
        },
        {
            name:
                "Sous surveillance",
            emoji:
                "👁️",
            color:
                "#D35400"
        },
        {
            name:
                "En cavale",
            emoji:
                "🏃",
            color:
                "#A93226"
        },
        {
            name:
                "Séquestré·e",
            emoji:
                "🔒",
            color:
                "#641E16"
        }
    ]);

class StateTypeV2Manager {

    map(
        row
    ) {
        if (!row) {
            return null;
        }

        return {
            id:
                row.id,
            guildId:
                row.guild_id,
            name:
                row.name,
            emoji:
                row.emoji
                || null,
            color:
                row.color
                || "#2B2D31",
            createdBy:
                row.created_by,
            createdAt:
                row.created_at
        };
    }

    createStateType(
        data
    ) {
        const guildId =
            String(
                data.guildId
                || ""
            ).trim();

        const name =
            String(
                data.name
                || ""
            ).trim();

        const createdBy =
            String(
                data.createdBy
                || ""
            ).trim();

        if (
            !guildId
            || !name
            || !createdBy
        ) {
            throw new Error(
                "Le serveur, le nom et le créateur du type d’état sont obligatoires."
            );
        }

        if (
            repository.getByName(
                guildId,
                name
            )
        ) {
            throw new Error(
                "Un type d’état portant ce nom existe déjà sur ce serveur."
            );
        }

        return this.map(
            repository.create({
                guildId,
                name,
                emoji:
                    String(
                        data.emoji
                        || ""
                    ).trim()
                    || null,
                color:
                    String(
                        data.color
                        || ""
                    ).trim()
                    || "#2B2D31",
                createdBy,
                createdAt:
                    new Date()
                        .toISOString()
            })
        );
    }

    getStateTypeById(
        stateTypeId
    ) {
        return this.map(
            repository.getById(
                stateTypeId
            )
        );
    }

    getStateTypesByGuild(
        guildId
    ) {
        return repository
            .getByGuild(
                guildId
            )
            .map(
                row =>
                    this.map(row)
            );
    }

    installDefaultStateTypes(
        guildId,
        createdBy
    ) {
        return repository
            .insertDefaults(
                String(guildId),
                DEFAULT_STATE_TYPES,
                String(createdBy),
                new Date()
                    .toISOString()
            )
            .map(
                row =>
                    this.map(row)
            );
    }

    countStatesUsingType(
        guildId,
        stateTypeId
    ) {
        return repository
            .countUsages(
                guildId,
                stateTypeId
            );
    }

    deleteStateType(
        guildId,
        stateTypeId
    ) {
        const stateType =
            this.getStateTypeById(
                stateTypeId
            );

        if (
            !stateType
            || String(
                stateType.guildId
            )
            !== String(
                guildId
            )
        ) {
            throw new Error(
                "Ce type d’état est introuvable sur ce serveur."
            );
        }

        repository.delete(
            guildId,
            stateTypeId
        );

        return stateType;
    }

}

module.exports =
    new StateTypeV2Manager();
