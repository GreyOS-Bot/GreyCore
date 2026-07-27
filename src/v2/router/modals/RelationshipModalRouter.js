const relationshipHandler =
    require(
        "../../interactions/relationships/RelationshipV2Handler"
    );

module.exports =
    async function relationshipModalRouter(
        interaction
    ) {
        if (!interaction.isModalSubmit()) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_relationship_search:"
            )
        ) {
            await relationshipHandler.search(
                interaction,
                customId.split(":")[1]
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_rel_create:"
            )
        ) {
            const [
                ,
                continuityAId,
                continuityBId,
                relationshipTypeId
            ] = customId.split(":");

            await relationshipHandler.create(
                interaction,
                continuityAId,
                continuityBId,
                relationshipTypeId
            );

            return true;
        }

        if (
            customId.startsWith(
                "v2_relationship_edit_submit:"
            )
        ) {
            const [
                ,
                characterId,
                relationshipId
            ] = customId.split(":");

            await relationshipHandler.edit(
                interaction,
                characterId,
                relationshipId
            );

            return true;
        }

        return false;
    };
