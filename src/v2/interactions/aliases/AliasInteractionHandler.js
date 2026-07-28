const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

const aliasManager =
    require(
        "../../managers/CharacterAliasV2Manager"
    );

const aliasPage =
    require(
        "../../pages/character/CharacterAliasesPage"
    );

const modalFactory =
    require("./AliasModalFactory");

const {
    replyError,
    replyPrivate
} = require(
    "../../core/services/InteractionResponseService"
);

async function open(
    interaction,
    characterId
) {
    const character =
        await getOwnedCharacter(
            interaction,
            characterId
        );

    if (!character) {
        return;
    }

    return interaction.update(
        aliasPage.build(
            character,
            aliasManager.getForCharacter(
                character.id
            )
        )
    );
}

async function openAdd(
    interaction,
    characterId
) {
    const character =
        await getOwnedCharacter(
            interaction,
            characterId
        );

    if (!character) {
        return;
    }

    return interaction.showModal(
        modalFactory.createAddModal(
            character.id
        )
    );
}

async function add(
    interaction,
    characterId
) {
    const character =
        await getOwnedCharacter(
            interaction,
            characterId
        );

    if (!character) {
        return;
    }

    const alias = aliasManager.add(
        character.id,
        interaction.fields.getTextInputValue(
            "alias"
        )
    );

    return replyPrivate(
        interaction,
        `Alias ajout\u00e9 : **${alias.alias}**. Tu peux maintenant l'utiliser avec \`${alias.alias}:\`.`
    );
}

async function remove(
    interaction,
    characterId
) {
    const character =
        await getOwnedCharacter(
            interaction,
            characterId
        );

    if (!character) {
        return;
    }

    aliasManager.remove(
        character.id,
        interaction.values[0]
    );

    return interaction.update(
        aliasPage.build(
            character,
            aliasManager.getForCharacter(
                character.id
            )
        )
    );
}

async function getOwnedCharacter(
    interaction,
    characterId
) {
    const dashboardData =
        characterDashboardManager.getDashboardData(
            characterId,
            {
                guildId:
                    interaction.guildId
            }
        );

    const character =
        dashboardData?.character;

    if (!character) {
        await replyError(
            interaction,
            "Ce personnage est introuvable."
        );

        return null;
    }

    if (
        !characterManagementPolicy.isOwner(
            interaction,
            character
        )
    ) {
        await replyError(
            interaction,
            "Tu ne peux pas g\u00e9rer les alias de ce personnage."
        );

        return null;
    }

    return character;
}

module.exports = {
    open,
    openAdd,
    add,
    remove
};
