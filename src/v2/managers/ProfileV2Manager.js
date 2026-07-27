const {
    PROFILE_FIELDS,
    repository
} = require(
    "../repositories/ProfileRepository"
);

class ProfileV2Manager {

    get(
        continuityId
    ) {
        return repository
            .get(
                continuityId
            );
    }

    create(
        data
    ) {
        const continuityId =
            String(
                data.continuityId
                || ""
            ).trim();

        if (!continuityId) {
            throw new Error(
                "La continuité du profil est obligatoire."
            );
        }

        return repository.insert(
            continuityId,
            this.buildNewProfile(
                data
            ),
            new Date()
                .toISOString()
        );
    }

    update(
        continuityId,
        data
    ) {
        const current =
            this.get(
                continuityId
            );

        if (!current) {
            throw new Error(
                "Profil introuvable."
            );
        }

        const updatedProfile = {};

        for (
            const field
            of PROFILE_FIELDS
        ) {
            updatedProfile[field] =
                Object.prototype
                    .hasOwnProperty
                    .call(
                        data,
                        field
                    )
                    ? data[field]
                    : current[field];
        }

        return repository.update(
            continuityId,
            updatedProfile,
            new Date()
                .toISOString()
        );
    }

    getOrCreate(
        continuityId
    ) {
        return (
            this.get(
                continuityId
            )
            || this.create({
                continuityId
            })
        );
    }

    buildNewProfile(
        data
    ) {
        const profile = {};

        for (
            const field
            of PROFILE_FIELDS
        ) {
            profile[field] =
                field === "age"
                    ? data[field]
                        ?? null
                    : data[field]
                    || null;
        }

        return profile;
    }

}

module.exports =
    new ProfileV2Manager();
