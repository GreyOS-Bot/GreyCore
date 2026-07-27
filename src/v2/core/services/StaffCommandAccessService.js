const validationStaffPolicy =
    require(
        "../policies/ValidationStaffPolicy"
    );

const {
    replyError
} = require(
    "./InteractionResponseService"
);

async function requireStaffCommandAccess(
    interaction
) {
    if (
        validationStaffPolicy
            .canManageServerTools(
                interaction
            )
    ) {
        return true;
    }

    await replyError(
        interaction,
        "Cette commande est réservée au staff : il faut pouvoir accéder au salon de validation configuré."
    );

    return false;
}

module.exports = {
    requireStaffCommandAccess
};
