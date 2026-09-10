const repository =
    require(
        "../repositories/InstallationEncounterRepository"
    );

class LegacyEncounterV2Manager {

    getById(
        encounterId
    ) {
        return repository
            .getById(
                encounterId
            );
    }

    getForContinuity(
        continuityId
    ) {
        return repository
            .getForContinuity(
                continuityId
            );
    }

    create(
        data
    ) {
        const continuityAId =
            String(
                data.continuityAId
                || ""
            ).trim();

        const continuityBId =
            String(
                data.continuityBId
                || ""
            ).trim()
            || null;

        const externalName =
            String(
                data.externalName
                || ""
            ).trim()
            || null;

        if (!continuityAId) {
            throw new Error(
                "Continuité principale introuvable."
            );
        }

        if (
            continuityBId
            && continuityAId ===
                continuityBId
        ) {
            throw new Error(
                "Une continuité ne peut pas se rencontrer elle-même."
            );
        }

        if (
            !continuityBId
            && !externalName
        ) {
            throw new Error(
                "Le personnage rencontré est obligatoire."
            );
        }

        this.requireContinuity(
            continuityAId,
            "Continuité principale introuvable."
        );

        if (continuityBId) {
            this.requireContinuity(
                continuityBId,
                "Continuité rencontrée introuvable."
            );
        }

        const createdBy =
            String(
                data.createdBy
                || ""
            ).trim();

        if (!createdBy) {
            throw new Error(
                "Le créateur de la rencontre est obligatoire."
            );
        }

        const now =
            new Date()
                .toISOString();

        return repository.insert({
            continuityAId,
            continuityBId,
            externalName:
                continuityBId
                    ? null
                    : externalName,
            location:
                this.normalizeOptionalText(
                    data.location
                ),
            note:
                this.normalizeOptionalText(
                    data.note
                ),
            occurredAt:
                this.normalizeDate(
                    data.occurredAt,
                    now.slice(
                        0,
                        10
                    )
                ),
            createdBy,
            createdAt:
                now,
            updatedAt:
                now
        });
    }

    update(
        encounterId,
        data
    ) {
        const encounter =
            this.requireEncounter(
                encounterId
            );

        const externalName =
            data.externalName ===
                undefined
                ? encounter
                    .external_name
                : this.normalizeOptionalText(
                    data.externalName
                );

        if (
            !encounter
                .continuity_b_id
            && !externalName
        ) {
            throw new Error(
                "Le personnage rencontré est obligatoire."
            );
        }

        return repository.update(
            encounterId,
            {
                externalName,
                location:
                    data.location ===
                        undefined
                        ? encounter.location
                        : this
                            .normalizeOptionalText(
                                data.location
                            ),
                note:
                    data.note ===
                        undefined
                        ? encounter.note
                        : this
                            .normalizeOptionalText(
                                data.note
                            ),
                occurredAt:
                    this.normalizeDate(
                        data.occurredAt,
                        encounter
                            .occurred_at
                    ),
                updatedAt:
                    new Date()
                        .toISOString()
            }
        );
    }

    delete(
        encounterId
    ) {
        const encounter =
            this.requireEncounter(
                encounterId
            );

        repository.delete(
            encounterId
        );

        return encounter;
    }

    requireEncounter(
        encounterId
    ) {
        const encounter =
            this.getById(
                encounterId
            );

        if (!encounter) {
            throw new Error(
                "Rencontre introuvable."
            );
        }

        return encounter;
    }

    requireContinuity(
        continuityId,
        errorMessage
    ) {
        const continuity =
            repository
                .getContinuityById(
                    continuityId
                );

        if (!continuity) {
            throw new Error(
                errorMessage
            );
        }

        return continuity;
    }

    normalizeOptionalText(
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
            !/^\d{4}-\d{2}-\d{2}$/
                .test(
                    normalized
                )
        ) {
            throw new Error(
                "La date doit respecter le format AAAA-MM-JJ."
            );
        }

        const parsed =
            new Date(
                `${normalized}T00:00:00.000Z`
            );

        if (
            Number.isNaN(
                parsed.getTime()
            )
            || parsed
                .toISOString()
                .slice(
                    0,
                    10
                ) !== normalized
        ) {
            throw new Error(
                "La date de la rencontre est invalide."
            );
        }

        return normalized;
    }

}

class EncounterV2Manager {
    getById(id) { return repository.getById(id); }
    getLegacyUnmigratedExternal() { return repository.getLegacyUnmigratedExternal(); }
    getForInstallationInContext(installationId,guildId,contextId) {
        const installation=this.requireInstallation(installationId); this.requireScope(installation,guildId,contextId);
        return repository.getForInstallation(installation.id,guildId,contextId);
    }
    getEligibleTargets(installationId,guildId,contextId) {
        const installation=this.requireInstallation(installationId); this.requireScope(installation,guildId,contextId);
        return repository.getEligibleTargets(guildId,contextId,installation.id);
    }
    create(data) {
        const a=this.requireInstallation(data.installationAId); this.requireScope(a,data.guildId,data.contextId); this.requireMutable(a,"Impossible d’ajouter une rencontre dans ce contexte.");
        const externalName=this.normalizeOptionalText(data.externalName); let b=null;
        if (data.installationBId) {
            b=this.requireInstallation(data.installationBId); this.requireScope(b,data.guildId,data.contextId); this.requireMutable(b,"Le personnage rencontré n’est pas jouable dans ce contexte.");
            if (Number(a.id)===Number(b.id)) throw new Error("Une installation ne peut pas se rencontrer elle-même.");
            if (externalName) throw new Error("Une rencontre interne ne peut pas posséder de nom externe.");
        } else if (!externalName) throw new Error("Le personnage rencontré est obligatoire.");
        const createdBy=String(data.createdBy||"").trim(); if (!createdBy) throw new Error("Le créateur de la rencontre est obligatoire.");
        if (createdBy!==String(a.owner_discord_user_id)) throw new Error("Seul le propriétaire peut créer cette rencontre.");
        const now=new Date().toISOString();
        return repository.create({guildId:String(data.guildId),contextId:data.contextId,installationAId:a.id,installationBId:b?.id||null,
            externalName:b?null:externalName,location:this.normalizeOptionalText(data.location),note:this.normalizeOptionalText(data.note),
            occurredAt:this.normalizeDate(data.occurredAt,now.slice(0,10)),createdBy,createdAt:now,updatedAt:now});
    }
    updateScoped(id,scope,data) {
        const encounter=this.requireScopedEncounter(id,scope);
        if (Number(encounter.context_is_active)!==1) throw new Error("Impossible de modifier une rencontre dans un contexte inactif.");
        for (const field of ["guildId","contextId","installationAId","installationBId","legacyEncounterId"]) {
            if (data[field]!==undefined) throw new Error("Le scope et le type d’une rencontre sont immuables.");
        }
        if (encounter.installation_b_id && data.externalName!==undefined) throw new Error("Une rencontre interne ne peut pas devenir externe.");
        const externalName=data.externalName===undefined?encounter.external_name:this.normalizeOptionalText(data.externalName);
        if (!encounter.installation_b_id&&!externalName) throw new Error("Le personnage rencontré est obligatoire.");
        return repository.update(id,{externalName,location:data.location===undefined?encounter.location:this.normalizeOptionalText(data.location),
            note:data.note===undefined?encounter.note:this.normalizeOptionalText(data.note),occurredAt:this.normalizeDate(data.occurredAt,encounter.occurred_at),updatedAt:new Date().toISOString()});
    }
    deleteScoped(id,scope) { const encounter=this.requireScopedEncounter(id,scope); repository.delete(id); return encounter; }
    requireScopedEncounter(id,scope) {
        const e=this.getById(id); if (!e) throw new Error("Rencontre introuvable.");
        if (Number(e.installation_a_id)!==Number(scope.installationId)||String(e.guild_id)!==String(scope.guildId)||String(e.context_id)!==String(scope.contextId)) throw new Error("Cette rencontre n’appartient pas à cette installation.");
        if (!scope.actorId||String(e.owner_discord_user_id)!==String(scope.actorId)) throw new Error("Seul le propriétaire peut gérer cette rencontre.");
        return e;
    }
    requireInstallation(id) { const i=repository.getInstallation(id); if (!i) throw new Error("Installation introuvable."); return i; }
    requireScope(i,guild,context) { if (String(i.guild_id)!==String(guild)||String(i.context_id)!==String(context)) throw new Error("Installation hors contexte."); }
    requireMutable(i,message) { if (i.status!=="approved"||Number(i.proxy_enabled)!==1||Number(i.is_archived)===1||Number(i.context_is_active)!==1) throw new Error(message); }
    normalizeOptionalText(value) { return String(value||"").trim()||null; }
    normalizeDate(value,fallback) { if (!value) return fallback; const n=String(value).trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(n)) throw new Error("La date doit respecter le format AAAA-MM-JJ."); const d=new Date(`${n}T00:00:00.000Z`); if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==n) throw new Error("La date de la rencontre est invalide."); return n; }
}

module.exports = new EncounterV2Manager();
