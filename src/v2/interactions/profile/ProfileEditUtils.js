function optionalText(
    value
) {
    if (
        value === null
        || value === undefined
    ) {
        return "";
    }

    return String(value);
}

function normalize(
    value
) {
    const text =
        String(value || "")
            .normalize("NFC")
            .trim();

    return text || null;
}

function getContinuityId(
    dashboardData
) {
    return (
        dashboardData.continuity
            ?.continuity_id
        || dashboardData.continuity
            ?.id
        || dashboardData.profile
            ?.continuity_id
        || null
    );
}

function readNormalizedField(
    interaction,
    fieldId
) {
    return normalize(
        interaction.fields
            .getTextInputValue(
                fieldId
            )
    );
}

module.exports = {
    optionalText,
    normalize,
    getContinuityId,
    readNormalizedField
};
