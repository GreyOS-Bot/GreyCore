const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const guideView =
    require(
        "../src/v2/views/help/GettingStartedGuideView"
    );

const helpCommand =
    require("../src/commands/aide");

test(
    "le guide de démarrage détaille la configuration du serveur et les commandes utiles",
    async () => {
        const welcomeGuide =
            guideView.build()
                .embeds[0]
                .toJSON();

        const welcomeContent = [
            welcomeGuide.description,
            ...welcomeGuide.fields.map(field =>
                field.value
            )
        ].join("\n");

        assert.match(
            welcomeContent,
            /\/staff/
        );

        assert.match(
            welcomeContent,
            /\/greycore/
        );

        assert.match(
            welcomeContent,
            /\/personnage/
        );

        assert.match(
            welcomeContent,
            /boutons, menus et formulaires/
        );

        const characterGuide =
            guideView.build("personnages")
                .embeds[0]
                .toJSON();

        assert.match(
            characterGuide.fields[0].value,
            /\/personnage creer/
        );

        assert.match(
            characterGuide.fields[1].value,
            /validation.*staff/i
        );

        const relationshipGuide =
            guideView.build("relations")
                .embeds[0]
                .toJSON();

        assert.match(
            relationshipGuide.title,
            /Relations/
        );

        let reply;

        await helpCommand.execute({
            options: {
                getString: () => "etats"
            },
            inGuild: () => true,
            reply: async payload => {
                reply = payload;
            }
        });

        assert.match(
            reply.embeds[0]
                .toJSON()
                .title,
            /États/
        );
    }
);
