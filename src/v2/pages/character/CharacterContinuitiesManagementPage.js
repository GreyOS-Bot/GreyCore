const {
    ActionRowBuilder
} = require("discord.js");

const UI =
    require("../../framework");

const characterDashboardManager =
    require(
        "../../services/dashboard/CharacterDashboardManager"
    );

const continuityManager =
    require(
        "../../managers/ContinuityV2Manager"
    );

const installationManager =
    require(
        "../../managers/InstallationV2Manager"
    );

const characterManagementPolicy =
    require(
        "../../core/policies/CharacterManagementPolicy"
    );

const MAX_CONTINUITIES = 20;
const BUTTONS_PER_ROW = 5;

class CharacterContinuitiesManagementPage {

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

                embeds: [],
                components: []

            });

        }

        if (
            !characterManagementPolicy
                .isOwner(
                    interaction,
                    dashboardData
                        .character
                )
        ) {
            return interaction.update({
                content:
                    "❌ Tu ne peux pas gérer les continuités de ce personnage.",
                embeds: [],
                components: []
            });
        }

        const continuities =
            continuityManager.getByCharacter(
                characterId
            );

        const displayedContinuities =
            continuities.slice(
                0,
                MAX_CONTINUITIES
            );

        const embed =
            UI.embed.create({

                title:
                    null,

                thumbnail:
                    dashboardData.character
                        .avatar_url
                    || null,

                description: [
                    UI.components
                        .characterHeader
                        .build(
                            dashboardData.character
                        ),
                    "### 📚 Installations",
                    this.getSummary(
                        continuities.length
                    )
                ].join("\n\n")

            });

        if (
            displayedContinuities.length === 0
        ) {

            embed.addFields({

                name:
                    "Aucune continuité",

                value:
                    "Ce personnage ne possède encore aucune continuité."

            });

        } else {

            embed.addFields(
                displayedContinuities.map(
                    continuity => {

                        const installations =
                            installationManager
                                .getByContinuity(
                                    continuity.id
                                );

                        return {

                            name:
                                `📖 ${continuity.name}`,

                            value:
                                this.getInstallationLabel(
                                    installations
                                        .length
                                ),

                            inline:
                                false

                        };

                    }
                )
            );

        }

        if (
            continuities.length >
            MAX_CONTINUITIES
        ) {

            embed.setFooter({

                text:
                    `Les ${MAX_CONTINUITIES} premières continuités sont affichées sur ${continuities.length}.`

            });

        }

        const rows =
            this.buildOpenRows(
                displayedContinuities
            );

        rows.push(
            new ActionRowBuilder()
                .addComponents(

                    UI.button.secondary({

                        id:
                            `page:character:home:${characterId}`,

                        label:
                            "Retour",

                        emoji:
                            "⬅️"

                    }),

                    UI.components.navigation.home(),
                    UI.components.navigation.library(),

                    UI.components.navigation
                        .close()

                )
        );

        return interaction.update(

            UI.page.create({

                embed,
                components:
                    rows

            })

        );

    }

    buildOpenRows(continuities) {

        const rows = [];

        for (
            let index = 0;
            index < continuities.length;
            index += BUTTONS_PER_ROW
        ) {

            const group =
                continuities.slice(
                    index,
                    index + BUTTONS_PER_ROW
                );

            rows.push(
                new ActionRowBuilder()
                    .addComponents(
                        group.map(
                            continuity =>
                                UI.button.primary({

                                    id:
                                        `page:character:installation:${continuity.id}`,

                                    label:
                                        this.getButtonLabel(
                                            continuity.name
                                        ),

                                    emoji:
                                        "📖"

                                })
                        )
                    )
            );

        }

        return rows;

    }

    getSummary(count) {

        if (count === 0) {
            return "Ce personnage ne possède aucune continuité.";
        }

        if (count === 1) {
            return "Ce personnage possède 1 continuité.";
        }

        return `Ce personnage possède ${count} continuités.`;

    }

    getInstallationLabel(count) {

        if (count === 0) {
            return "❌ Non installée";
        }

        if (count === 1) {
            return "✅ Installée sur 1 serveur";
        }

        return `✅ Installée sur ${count} serveurs`;

    }

    getButtonLabel(name) {

        const value =
            String(name || "Continuité")
                .trim();

        const maxNameLength = 65;

        return value.length > maxNameLength
            ? `Ouvrir · ${value.slice(
                0,
                maxNameLength - 1
            )}…`
            : `Ouvrir · ${value}`;

    }

}

module.exports =
    new CharacterContinuitiesManagementPage();
