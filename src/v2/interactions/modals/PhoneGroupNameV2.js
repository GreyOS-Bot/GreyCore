const PhoneGroupCreationPage =
    require(
        "../../pages/character/PhoneGroupCreationPage"
    );

const groupDraftService =
    require(
        "../../services/phone/PhoneGroupDraftService"
    );

const {
    replyError
} = require(
    "../../core/services/InteractionResponseService"
);

module.exports =
    async function PhoneGroupNameV2(
        interaction
    ) {
        const characterId =
            interaction.customId.split(":")[1];

        const draft =
            groupDraftService.get(
                interaction.user.id,
                characterId
            );

        if (!draft) {
            return replyError(
                interaction,
                "La création de ce groupe a expiré."
            );
        }

        groupDraftService.setName({
            userId:
                interaction.user.id,
            characterId,
            ownerPhoneId:
                draft.ownerPhoneId,
            name:
                interaction.fields
                    .getTextInputValue("name")
        });

        return PhoneGroupCreationPage.render(
            interaction,
            characterId
        );
    };
