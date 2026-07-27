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
            /config validation/
        );

        assert.match(
            welcomeContent,
            /installer-relations/
        );

        assert.match(
            welcomeContent,
            /installer-etats/
        );

        assert.match(
            welcomeContent,
            /etattype creer/
        );

        assert.equal(
            welcomeContent.indexOf(
                "/installer-etats"
            ) < welcomeContent.indexOf(
                "/etattype creer"
            ),
            true
        );

        assert.match(
            welcomeContent,
            /relationtype creer.*etattype creer/
        );

        const characterGuide =
            guideView.build("personnages")
                .embeds[0]
                .toJSON();

        assert.match(
            characterGuide.fields[0].value,
            /personnages liste/
        );

        assert.match(
            characterGuide.fields[0].value,
            /modification de fiche ou d’avatar/
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
