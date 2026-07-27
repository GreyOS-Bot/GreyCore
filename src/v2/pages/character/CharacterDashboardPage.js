const {
    ActionRowBuilder
} = require("discord.js");

const UI = require("../../framework");

class CharacterDashboardPage {

    build(character, counts = null, {
        isOwner = false,
        modules = []
    } = {}) {
        const characterId = character.id ?? character.char_uuid;

        if (!characterId) {
            throw new Error(
                "CharacterDashboardPage : identifiant du personnage introuvable."
            );
        }

        const headerCharacter = {
            ...character,
            display_name: character.proxy_name
                || character.display_name
                || character.name
                || "Personnage",
            organization: character.organization_name
                || character.gang_name
                || character.organization
                || character.gang
                || null,
            age: character.age ?? character.base_age ?? null,
            character_type: character.character_type
                || character.characterType
                || character.type
                || (character.is_npc ? "pnj" : "personnage_joue")
        };

        const isEnabled = moduleKey => {
            const module = modules.find(
                entry => entry.key === moduleKey
            );

            return module
                ? module.isEnabled
                : true;
        };

        const buttons = [
            UI.button.primary({
                id: `page:character:category:character:${characterId}`,
                label: "Personnage",
                emoji: "📄"
            })
        ];

        if (
            isEnabled("relationships")
            || isEnabled("encounters")
            || (isOwner && isEnabled("phone"))
        ) {
            buttons.push(
                UI.button.primary({
                    id: `page:character:category:social:${characterId}`,
                    label: "Vie sociale",
                    emoji: "❤️"
                })
            );
        }

        if (isEnabled("assets")) {
            buttons.push(
                UI.button.primary({
                    id: `page:character:category:possessions:${characterId}`,
                    label: "Biens",
                    emoji: "🎒"
                })
            );
        }

        if (isOwner) {
            buttons.push(
                UI.button.secondary({
                    id: `page:character:category:management:${characterId}`,
                    label: "Configuration",
                    emoji: "⚙️"
                })
            );
        }

        return UI.page.create({
            embed: UI.embed.create({
                title: null,
                thumbnail: character.avatar_url || null,
                description: UI.components.characterHeader.build(
                    headerCharacter
                )
            }),
            components: [
                new ActionRowBuilder().addComponents(...buttons),
                new ActionRowBuilder().addComponents(
                    UI.components.navigation.library(),
                    UI.components.navigation.close()
                )
            ]
        });
    }
}

module.exports =
    new CharacterDashboardPage();
