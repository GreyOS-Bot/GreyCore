const createStoryModal =
    require("../modals/createStoryModal");

module.exports =
    async interaction => {

        const continuityId =
            interaction.customId
                .split(":")[1];

        return interaction.showModal(

            createStoryModal(
                continuityId
            )

        );

    };