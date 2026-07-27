const db =
    require(
        "../../database/database"
    );

function cleanupDeletedGuild(
    guildId
) {
    const cleanup =
        db.transaction(
            id => {
                const installations =
                    db.prepare(`
                        SELECT
                            id,
                            continuity_id
                        FROM CharacterGuildInstallationsV2
                        WHERE guild_id = ?
                    `).all(id);

                if (!installations.length) {
                    return {
                        guildId: id,
                        installationCount: 0,
                        continuityCount: 0
                    };
                }

                const installationIds =
                    installations.map(
                        installation =>
                            String(installation.id)
                    );

                const continuityIds =
                    [
                        ...new Set(
                            installations.map(
                                installation =>
                                    installation
                                        .continuity_id
                            )
                        )
                    ];

                db.prepare(`
                    DELETE FROM CharacterInstallationMessagesV2
                    WHERE guild_id = ?
                `).run(id);

                db.prepare(`
                    DELETE FROM CharacterGuildInstallationsV2
                    WHERE guild_id = ?
                `).run(id);

                const deleteMappings =
                    db.prepare(`
                        DELETE FROM MigrationV1ToV2
                        WHERE new_id = ?
                    `);

                for (
                    const installationId
                    of installationIds
                ) {
                    deleteMappings.run(
                        installationId
                    );
                }

                const hasInstallation =
                    db.prepare(`
                        SELECT 1
                        FROM CharacterGuildInstallationsV2
                        WHERE continuity_id = ?
                        LIMIT 1
                    `);

                const deleteContinuity =
                    db.prepare(`
                        DELETE FROM CharacterContinuitiesV2
                        WHERE id = ?
                    `);

                let continuityCount = 0;

                for (
                    const continuityId
                    of continuityIds
                ) {
                    if (
                        hasInstallation.get(
                            continuityId
                        )
                    ) {
                        continue;
                    }

                    deleteMappings.run(
                        continuityId
                    );

                    const result =
                        deleteContinuity.run(
                            continuityId
                        );

                    continuityCount +=
                        result.changes;
                }

                return {
                    guildId: id,
                    installationCount:
                        installations.length,
                    continuityCount
                };
            }
        );

    return cleanup(
        String(guildId)
    );
}

module.exports = {
    cleanupDeletedGuild
};
