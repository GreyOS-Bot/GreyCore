const editProxyMessage =
    require(
        "../../interactions/modals/editProxyMessage"
    );

module.exports =
    async function proxyModalRouter(
        interaction
    ) {
        if (
            !interaction.isModalSubmit()
            ||
            !interaction.customId.startsWith(
                "proxy_edit_modal:"
            )
        ) {
            return false;
        }

        await editProxyMessage(
            interaction
        );

        return true;
    };
