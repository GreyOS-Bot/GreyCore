const InstallationStatus =
    require(
        "../constants/InstallationStatus"
    );

class InstallationAccessPolicy {

    isPlayable(installation) {

        return Boolean(
            installation
            && installation.status ===
                InstallationStatus.APPROVED
            && Number(
                installation.proxy_enabled
            ) === 1
        );

    }

}

module.exports =
    new InstallationAccessPolicy();
