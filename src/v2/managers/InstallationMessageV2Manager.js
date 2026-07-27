const repository =
    require(
        "../repositories/InstallationMessageRepository"
    );

class InstallationMessageV2Manager {

    getByInstallationId(
        installationId
    ) {
        return repository
            .getByInstallationId(
                installationId
            );
    }

    save(
        data
    ) {
        const now =
            new Date()
                .toISOString();

        return repository.save({
            installationId:
                data.installationId,
            guildId:
                data.guildId,
            channelId:
                data.channelId,
            messageId:
                data.messageId,
            createdAt:
                data.createdAt
                || now,
            updatedAt:
                data.updatedAt
                || now
        });
    }

    delete(
        installationId
    ) {
        const message =
            this.getByInstallationId(
                installationId
            );

        if (!message) {
            return null;
        }

        repository.delete(
            installationId
        );

        return message;
    }

}

module.exports =
    new InstallationMessageV2Manager();
