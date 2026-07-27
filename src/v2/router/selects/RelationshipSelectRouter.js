const relationshipHandler =
    require(
        "../../interactions/relationships/RelationshipV2Handler"
    );

module.exports =
    async function relationshipSelectRouter(
        interaction
    ) {
        if (
            !interaction
                .isStringSelectMenu()
        ) {
            return false;
        }

        const customId =
            interaction.customId;

        if (
            customId.startsWith(
                "v2_relationship_character:"
            )
        ) {
            await relationshipHandler
                .selectCharacter(
                    interaction,
                    customId.split(":")[1],
                    interaction.values[0]
                );

            return true;
        }

        if (
            customId.startsWith(
                "v2_relationship_type:"
            )
        ) {
            const [
                otherCharacterId,
                relationshipTypeId
            ] = interaction.values[0]
                .split(":");

            await relationshipHandler
                .selectType(
                    interaction,
                    customId.split(":")[1],
                    otherCharacterId,
                    relationshipTypeId
                );

            return true;
        }

        if (
            customId.startsWith(
                "v2_relationship_manage_select:"
            )
        ) {
            await relationshipHandler
                .openDetails(
                    interaction,
                    customId.split(":")[1],
                    interaction.values[0]
                );

            return true;
        }

        return false;
    };
