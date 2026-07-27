const { ActionRowBuilder } = require("discord.js");

const UI = require("../../framework");

const characterDashboardManager =
    require("../../services/dashboard/CharacterDashboardManager");

const characterCategoryPage =
    require("./CharacterCategoryPage");

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

class CharacterManagementCategoryPage {

    async execute(
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

        if (!dashboardData) {

            return interaction.update({

                content:
                    "❌ Ce personnage est introuvable.",

                embeds:
                    [],

                components:
                    []

            });

        }

        if (
            !characterManagementPolicy
                .isOwner(
                    interaction,
                    dashboardData.character
                )
        ) {
            return interaction.update({
                content:
                    "❌ Seul le propriétaire peut gérer ce personnage.",
                embeds: [],
                components: []
            });
        }

        const installationCount =
            Number(
                dashboardData.counts
                    .installations ?? 0
            );

        const installationLabel =
            installationCount > 0
                ? `Installations (${installationCount})`
                : "Installations";

        const row =
            new ActionRowBuilder()
                .addComponents(

                    UI.button.success({

                        id:
                            `v2_character_deploy:${characterId}`,

                        label:
                            "Installer sur ce serveur",

                        emoji:
                            "🖥️"

                    }),

                    UI.button.primary({

                        id:
                            `page:character:installations:${characterId}`,

                        label:
                            `Gérer ${installationLabel.toLowerCase()}`,

                        emoji:
                            UI.icons.install

                    }),

                    UI.button.secondary({

                        id:
                            `page:character:settings:${characterId}`,

                        label:
                            "Paramètres",

                        emoji:
                            "⚙️"

                    })

                );

        const page =
            characterCategoryPage.build({

                character:
                    dashboardData.character,

                title:
    "⚙️ Configuration",

description:
    [
        "### 🖥️ Installer sur un autre serveur",
        "Utilise ce bouton depuis le **serveur de destination**.",
        "",
        "1. Clique sur **Installer sur ce serveur**.",
        "2. Choisis l’histoire à utiliser.",
        "3. Choisis entre **Personnage complet** ou **Nouvelle continuité**.",
        "4. Envoie ensuite l’installation au staff pour validation.",
        "",
        "🔒 Le proxy restera bloqué sur ce serveur jusqu’à l’accord du staff."
    ].join("\n"),

rows:
    [row]

            });

        return interaction.update(page);

    }

}

module.exports =
    new CharacterManagementCategoryPage();
