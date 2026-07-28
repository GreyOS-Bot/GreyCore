const test =
    require("node:test");

const assert =
    require("node:assert/strict");

const characterCreationService =
    require(
        "../src/v2/services/character/CharacterCreationV2Service"
    );

const characterHeader =
    require(
        "../src/v2/framework/components/CharacterHeader"
    );

const {
    normalize
} = require(
    "../src/v2/interactions/profile/ProfileEditUtils"
);

test(
    "les pr\u00e9noms accentu\u00e9s sont conserv\u00e9s \u00e0 la cr\u00e9ation, \u00e0 l'\u00e9dition et \u00e0 l'affichage",
    () => {
        const character =
            characterCreationService.normalize({
                discordUserId: "user",
                guildId: "guild",
                guildName: "Serveur",
                type: "personnage_joue",
                proxyName: "I\u0302ris",
                fullName: "I\u0302ris D'Ame",
                story: "Une histoire"
            });

        assert.equal(
            character.proxyName,
            "Îris"
        );
        assert.equal(
            character.firstname,
            "Îris"
        );
        assert.equal(
            normalize("  Ma\u00eblys  "),
            "Maëlys"
        );
        assert.equal(
            characterHeader.getDisplayName({
                proxy_name:
                    "A\u0302ura"
            }),
            "Âura"
        );
    }
);
