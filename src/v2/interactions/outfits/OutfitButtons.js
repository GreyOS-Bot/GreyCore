const outfitV2Handler =
    require("./OutfitV2Handler");

async function handleOutfitButtons(
    interaction
) {
    if (
        interaction.customId.startsWith(
            "v2_outfit_add:"
        )
    ) {
        const [
            ,
            continuityId
        ] =
            interaction.customId.split(":");

        await outfitV2Handler.openAddModal(
            interaction,
            continuityId
        );

        return true;
    }

    if (
    interaction.customId.startsWith(
        "v2_outfit_edit:"
    )
) {

    const [
        ,
        outfitId
    ] =
        interaction.customId.split(":");

    await outfitV2Handler.openEditModal(
        interaction,
        Number(outfitId)
    );

    return true;

}

if (
    interaction.customId.startsWith(
        "v2_outfit_change:"
    )
) {
    const continuityId =
    interaction.customId.split(":")[1];

    await outfitV2Handler.openChangeMenu(
    interaction,
    continuityId
);

    return true;
}

if (
    interaction.customId.startsWith(
        "v2_outfit_manage:"
    )
) {

    const continuityId =
        interaction.customId.split(":")[1];

    await outfitV2Handler.openManageMenu(
        interaction,
        continuityId
    );

    return true;

}

if (
    interaction.customId.startsWith(
        "v2_outfit_setcurrent:"
    )
) {

    const outfitId =
        Number(
            interaction.customId.split(":")[1]
        );

    await outfitV2Handler.setCurrent(
        interaction,
        outfitId
    );

    return true;

}

if (
    interaction.customId.startsWith(
        "v2_outfit_delete:"
    )
) {

    const outfitId =
        Number(
            interaction.customId.split(":")[1]
        );

    await outfitV2Handler.confirmDelete(
        interaction,
        outfitId
    );

    return true;

}

if (
    interaction.customId.startsWith(
        "v2_outfit_delete_confirm:"
    )
) {
    const outfitId =
        Number(
            interaction.customId.split(":")[1]
        );

    await outfitV2Handler.deleteConfirmed(
        interaction,
        outfitId
    );

    return true;
}

if (
    interaction.customId ===
    "v2_outfit_delete_cancel"
) {
    await interaction.update({
        content:
            "Suppression annulée.",
        embeds: [],
        components: []
    });

    return true;
}

    return false;
}

module.exports =
    handleOutfitButtons;
