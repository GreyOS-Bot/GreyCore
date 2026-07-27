const UI =
    require("../index");

class CharacterCard {

    build(character, continuities = []) {

        const fullname = [

            character.base_firstname,
            character.base_lastname

        ]
            .filter(Boolean)
            .join(" ");

        const installationList =
            continuities.length === 0

                ? UI.text.empty(
                    "Aucune installation."
                )

                : UI.text.list(

                    continuities.map(

                        continuity =>
                            `${continuity.name} (${continuity.installation_count} serveur(s))`

                    )

                );

        return UI.text.blocks([

            fullname

                ? UI.text.section(

                    `${UI.icons.profile} Identité`,

                    fullname

                )

                : null,

            UI.text.section(

                `${UI.icons.install} Installations`,

                [

                    `${character.installation_count || 0} serveur(s)`

                ]

            ),

            UI.text.section(

                `${UI.icons.install} Serveurs`,

                installationList

            )

        ]);

    }

}

module.exports =
    new CharacterCard();