const decisionService = require("./StaffPermissionDecisionService");

const ADMINISTRATIVE_PERMISSIONS = new Set([
    "settings",
    "logs",
    "automations",
    "scenes",
    "modules"
]);

function decide(interaction, permission, write = false) {
    const normalizedPermission = String(permission || "").trim();
    const mode = write === true ? "write" : "read";

    if (!ADMINISTRATIVE_PERMISSIONS.has(normalizedPermission)) {
        return Object.freeze({
            allowed: false,
            permission: normalizedPermission,
            mode,
            reason: decisionService.REASONS.UNKNOWN_PERMISSION,
            sources: Object.freeze([])
        });
    }

    return decisionService.decide({
        interaction,
        permission: normalizedPermission,
        write: write === true
    });
}

function canRead(interaction, permission) {
    return decide(interaction, permission, false).allowed;
}

function canWrite(interaction, permission) {
    return decide(interaction, permission, true).allowed;
}

module.exports = {
    decide,
    canRead,
    canWrite
};
