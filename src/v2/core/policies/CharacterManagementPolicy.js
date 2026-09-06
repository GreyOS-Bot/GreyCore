class CharacterManagementPolicy {

    getOwnerId(
        character
    ) {
        return (
            character?.discord_user_id
            || character?.owner_id
            || character?.ownerId
            || character?.user_id
            || null
        );
    }

    isOwner(
        interaction,
        character
    ) {
        const ownerId =
            this.getOwnerId(
                character
            );

        return Boolean(
            ownerId !== null
            && String(ownerId) ===
                String(
                    interaction.user?.id
                )
        );
    }

}

module.exports =
    new CharacterManagementPolicy();
