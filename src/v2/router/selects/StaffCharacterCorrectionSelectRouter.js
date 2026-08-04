const handler = require(
    "../../interactions/staff/StaffCharacterCorrectionHandler"
);

module.exports = async interaction => {
    if (
        !interaction.isStringSelectMenu()
        || !String(
            interaction.customId || ""
        ).startsWith(
            "v2_staff_character_type:"
        )
    ) {
        return false;
    }

    await handler.selectType(interaction);
    return true;
};
