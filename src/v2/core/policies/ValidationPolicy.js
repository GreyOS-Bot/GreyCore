const InstallationStatus =
    require("../constants/InstallationStatus");

class ValidationPolicy {

    canSubmit(context) {
    return (
        Boolean(
            context.avatarUrl
        )
        &&
        [
            InstallationStatus.DRAFT,
            InstallationStatus.REJECTED
        ].includes(
            context.status
        )
    );
}

    canApprove(context) {

        return (
            context.status ===
            InstallationStatus.PENDING
        );

    }

    canReject(context) {

        return (
            context.status ===
            InstallationStatus.PENDING
        );

    }

    canSuspend(context) {

        return (
            context.status ===
            InstallationStatus.APPROVED
        );

    }

    canReopen(context) {

        return [

            InstallationStatus.REJECTED,

            InstallationStatus.SUSPENDED

        ].includes(
            context.status
        );

    }

    canArchive(context) {

        return (
            context.status !==
            InstallationStatus.ARCHIVED
        );

    }

}

module.exports =
    new ValidationPolicy();
