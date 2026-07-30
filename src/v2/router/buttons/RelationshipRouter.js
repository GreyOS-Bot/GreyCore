const relationshipV2Handler =
    require(
        "../../interactions/relationships/RelationshipV2Handler"
    );

const familyTreePage =
    require(
        "../../pages/character/CharacterFamilyTreePage"
    );

module.exports =
    async function relationshipRouter(
        interaction
    ) {

        const customId =
            interaction.customId;

        if (
            interaction.isButton()
            && customId.startsWith(
                "v2rtp:"
            )
        ) {
            const [
                ,
                characterId,
                otherCharacterId,
                page
            ] = customId.split(":");

            await relationshipV2Handler
                .selectTypePage(
                    interaction,
                    characterId,
                    otherCharacterId,
                    Number(page)
                );

            return true;
        }

        if (
            interaction.isButton()
            && customId.startsWith(
                "v2_relationship_tree:"
            )
        ) {
            await familyTreePage.execute(
                interaction,
                customId.split(":")[1]
            );

            return true;
        }

        if (
            interaction.isButton()
            && customId.startsWith(
                "v2_relationship_request_accept:"
            )
        ) {
            await relationshipV2Handler
                .acceptRequest(
                    interaction,
                    customId.split(":")[1]
                );

            return true;
        }

        if (
            interaction.isButton()
            && customId.startsWith(
                "v2_relationship_request_reject:"
            )
        ) {
            await relationshipV2Handler
                .rejectRequest(
                    interaction,
                    customId.split(":")[1]
                );

            return true;
        }

        if (
            interaction.isButton()
            && customId.startsWith(
                "v2_relationship_delete_confirm:"
            )
        ) {
            const [
                ,
                characterId,
                relationshipId
            ] = customId.split(":");

            await relationshipV2Handler.delete(
                interaction,
                characterId,
                relationshipId
            );

            return true;
        }

        if (
            interaction.isButton()
            && customId.startsWith(
                "v2_relationship_add:"
            )
        ) {
            await relationshipV2Handler.openAdd(
                interaction,
                customId.split(":")[1]
            );

            return true;
        }

        if (
            interaction.isButton()
            && customId.startsWith(
                "v2_relationship_manage:"
            )
        ) {
            await relationshipV2Handler
                .openManage(
                    interaction,
                    customId.split(":")[1]
                );

            return true;
        }

        if (
            interaction.isButton()
            && customId.startsWith(
                "v2_relationship_details:"
            )
        ) {
            const [
                ,
                characterId,
                relationshipId
            ] = customId.split(":");

            await relationshipV2Handler
                .openDetails(
                    interaction,
                    characterId,
                    relationshipId
                );

            return true;
        }

        if (
            interaction.isButton()
            && customId.startsWith(
                "v2_relationship_edit:"
            )
        ) {
            const [
                ,
                characterId,
                relationshipId
            ] = customId.split(":");

            await relationshipV2Handler
                .openEdit(
                    interaction,
                    characterId,
                    relationshipId
                );

            return true;
        }

        if (
            interaction.isButton()
            && customId.startsWith(
                "v2_relationship_delete:"
            )
        ) {
            const [
                ,
                characterId,
                relationshipId
            ] = customId.split(":");

            await relationshipV2Handler
                .confirmDelete(
                    interaction,
                    characterId,
                    relationshipId
                );

            return true;
        }

        return false;

    };
