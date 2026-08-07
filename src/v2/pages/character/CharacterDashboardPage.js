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
            display_name: character.display_name
                || character.proxy_name
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

        const countLabel = (label, count) =>
            Number(count || 0) > 0
                ? `${label} (${count})`
                : label;

        const buttons = [UI.button.primary({
            id: `page:character:profile:${characterId}`,
            label: "Fiche",
            emoji: UI.icons.profile
        })];

        if (isEnabled("relationships")) {
            buttons.push(UI.button.primary({
                id: `page:character:relationships:${characterId}`,
                label: countLabel("Relations", counts?.relations),
                emoji: UI.icons.relations
            }));
        }

        if (isEnabled("encounters")) {
            buttons.push(UI.button.primary({
                id: `page:character:encounters:${characterId}`,
                label: countLabel("Rencontres", counts?.encounters),
                emoji: UI.icons.encounters
            }));
        }

        if (isOwner && isEnabled("phone")) {
            buttons.push(UI.button.primary({
                id: `v2_phone_open:${characterId}`,
                label: "Téléphone",
                emoji: UI.icons.phone
            }));
        }

        if (isEnabled("states")) {
            buttons.push(UI.button.primary({
                id: `page:character:states:${characterId}`,
                label: countLabel("États", counts?.states),
                emoji: UI.icons.states
            }));
        }

        if (isEnabled("outfit")) {
            buttons.push(UI.button.primary({
                id: `page:character:outfit:${characterId}`,
                label: "Tenues",
                emoji: UI.icons.outfit
            }));
        }

        if (isEnabled("journal")) {
            buttons.push(UI.button.primary({
                id: `page:character:journal:${characterId}`,
                label: countLabel("Journal", counts?.journal),
                emoji: UI.icons.journal
            }));
        }

        if (isEnabled("assets")) {
            buttons.push(UI.button.primary({
                id: `page:character:assets:${characterId}`,
                label: "Biens",
                emoji: UI.icons.inventory
            }));
        }

        if (isOwner) {
            buttons.push(UI.button.secondary({
                id: `page:character:category:management:${characterId}`,
                label: "Configuration",
                emoji: UI.icons.settings
            }));
        }

        const actionRows = [];
        for (let index = 0; index < buttons.length; index += 4) {
            actionRows.push(
                new ActionRowBuilder().addComponents(
                    ...buttons.slice(index, index + 4)
                )
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
                ...actionRows,
                new ActionRowBuilder().addComponents(
                    UI.components.navigation.home(),
                    UI.components.navigation.library(),
                    UI.components.navigation.close()
                )
            ]
        });
    }
}

module.exports =
    new CharacterDashboardPage();
