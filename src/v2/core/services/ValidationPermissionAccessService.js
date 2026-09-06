const decisionService = require("./StaffPermissionDecisionService");

function decide(interaction, write) {
    return decisionService.decide({
        interaction,
        permission: "characters",
        write,
        allowValidationBridge: true
    });
}

function canRead(interaction) {
    return decide(interaction, false).allowed;
}

function canWrite(interaction) {
    return decide(interaction, true).allowed;
}

module.exports = {
    canRead,
    canWrite,
    decide
};
