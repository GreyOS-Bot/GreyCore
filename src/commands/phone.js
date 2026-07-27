const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const UserV2Manager =
    require(
        "../v2/managers/UserV2Manager"
    );

const CharacterV2Manager =
    require(
        "../v2/managers/CharacterV2Manager"
    );

const CharacterPhonePage =
    require(
        "../v2/pages/character/CharacterPhonePage"
    );

const InstallationV2Manager =
    require(
        "../v2/managers/InstallationV2Manager"
    );

const InstallationAccessPolicy =
    require(
        "../v2/core/policies/InstallationAccessPolicy"
    );

const guildModuleManager =
    require(
        "../v2/managers/GuildModuleV2Manager"
    );

module.exports = {

    data:
        new SlashCommandBuilder()
            .setName(
                "phone"
            )
            .setDescription(
                "Ouvre directement le téléphone d’un personnage."
            )
            .addStringOption(option =>
                option
                    .setName(
                        "personnage"
                    )
                    .setDescription(
                        "Choisissez le personnage à utiliser."
                    )
                    .setRequired(
                        true
                    )
                    .setAutocomplete(
                        true
                    )
            ),

    getOwnedCharacters(
        discordUserId,
        guildId
    ) {

        const user =
            UserV2Manager
                .getByDiscordUserId(
                    discordUserId
                );

        if (!user) {

            console.warn(
                "⚠️ /phone : utilisateur V2 introuvable pour",
                discordUserId
            );

            return [];

        }

        const characters =
            CharacterV2Manager
                .getByOwner(
                    user.id
                )
            || [];

        console.log(
            "📱 /phone personnages trouvés :",
            characters.map(character => ({
                id:
                    character.id,
                name:
                    character.proxy_name,
                ownerUserId:
                    character.owner_user_id
            }))
        );

        return characters.filter(
            character =>
                InstallationV2Manager
                    .getByCharacter(
                        character.id
                    )
                    .some(
                        installation =>
                            String(
                                installation
                                    .guild_id
                            ) ===
                                String(guildId)
                            &&
                            InstallationAccessPolicy
                                .isPlayable(
                                    installation
                                )
                    )
        );

    },

    async autocomplete(
        interaction
    ) {

        if (
            !guildModuleManager.isEnabled(
                interaction.guildId,
                "phone"
            )
        ) {
            return interaction.respond([]);
        }

        try {

            const focusedValue =
                interaction.options
                    .getFocused()
                    .toLowerCase()
                    .trim();

            const characters =
                this.getOwnedCharacters(
                    interaction.user.id,
                    interaction.guildId
                );

            const results =
                characters
                    .filter(character => {

                        if (
                            Number(
                                character.is_archived
                            ) === 1
                        ) {
                            return false;
                        }

                        const name =
                            character.proxy_name
                            ||
                            character.name
                            ||
                            "";

                        return name
                            .toLowerCase()
                            .includes(
                                focusedValue
                            );

                    })
                    .slice(
                        0,
                        25
                    )
                    .map(character => ({

                        name:
                            character.proxy_name
                            ||
                            character.name
                            ||
                            "Personnage",

                        value:
                            String(
                                character.id
                            )

                    }));

            return interaction.respond(
                results
            );

        } catch (error) {

            console.error(
                "❌ Erreur autocomplétion /phone :",
                error
            );

            return interaction
                .respond([])
                .catch(
                    () => null
                );

        }

    },

    async execute(
        interaction
    ) {

        if (
            !guildModuleManager.isEnabled(
                interaction.guildId,
                "phone"
            )
        ) {
            return interaction.reply({
                content: "ℹ️ Le module Téléphone est désactivé sur ce serveur.",
                flags: MessageFlags.Ephemeral
            });
        }

        const selectedValue =
            interaction.options
                .getString(
                    "personnage",
                    true
                )
                .trim();

        const characters =
            this.getOwnedCharacters(
                interaction.user.id,
                interaction.guildId
            );

        const character =
            characters.find(item => {

                const itemName =
                    item.proxy_name
                    ||
                    item.name
                    ||
                    "";

                return (
                    String(
                        item.id
                    ) ===
                    String(
                        selectedValue
                    )

                    ||

                    itemName
                        .trim()
                        .toLowerCase()
                    ===
                    selectedValue
                        .trim()
                        .toLowerCase()
                );

            });

        if (!character) {

            console.warn(
                "⚠️ /phone : aucun personnage correspondant.",
                {
                    selectedValue,
                    availableCharacters:
                        characters.map(
                            item => ({
                                id:
                                    item.id,
                                name:
                                    item.proxy_name
                            })
                        )
                }
            );

            return interaction.reply({

                content:
                    "❌ Ce personnage est introuvable ou ne vous appartient pas.",

                flags:
                    MessageFlags.Ephemeral

            });

        }

        return CharacterPhonePage
            .execute(
                interaction,
                character.id
            );

    }

};
