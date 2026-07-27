const v2 =
    require("../../index");

const libraryHomeView =
    require(
        "../../views/home/LibraryHomeView"
    );

module.exports = async (
    interaction
) => {
    const user =
        v2.managers.user.getOrCreate(
            interaction.user.id
        );

    const statistics =
        v2.managers.library.getStatistics(
            user.id
        );

    const characters =
        v2.managers.library.getCharacters(
            user.id
        );

    const view =
        libraryHomeView.build(
            interaction.user,
            statistics,
            characters
        );

    return interaction.update(view);
};
