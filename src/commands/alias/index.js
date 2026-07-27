const { SlashCommandBuilder } = require("discord.js");

const characterManager = require("../../managers/CharacterManager");
const aliasManager = require("../../managers/AliasManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("alias")
        .setDescription("Gère les alias de tes personnages.")

        .addSubcommand(sub =>
            sub
                .setName("ajouter")
                .setDescription("Ajoute un alias à un personnage.")
                .addStringOption(option =>
                    option
                        .setName("personnage")
                        .setDescription("Nom du personnage")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("alias")
                        .setDescription("Alias à ajouter")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("liste")
                .setDescription("Affiche les alias d'un personnage.")
                .addStringOption(option =>
                    option
                        .setName("personnage")
                        .setDescription("Nom du personnage")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
    sub
        .setName("supprimer")
        .setDescription("Supprime un alias d'un personnage.")
        .addStringOption(option =>
            option
                .setName("personnage")
                .setDescription("Nom du personnage")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("alias")
                .setDescription("Alias à supprimer")
                .setRequired(true)
        )
),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "ajouter") {
            const characterName =
                interaction.options.getString("personnage");

            const alias =
                interaction.options.getString("alias");

            const character = characterManager.getCharacterByName(
                interaction.guild.id,
                interaction.user.id,
                characterName
            );

            if (!character) {
                return interaction.reply({
                    content: "❌ Personnage introuvable.",
                    ephemeral: true
                });
            }

            try {
                const createdAlias = aliasManager.addAlias(
                    interaction.guild.id,
                    character.id,
                    alias
                );

                return interaction.reply({
                    content:
                        `✅ Alias ajouté : **${createdAlias}** → **${character.name}**`,
                    ephemeral: true
                });
            } catch (error) {
                return interaction.reply({
                    content: `❌ ${error.message}`,
                    ephemeral: true
                });
            }
        }

        if (subcommand === "liste") {
            const characterName =
                interaction.options.getString("personnage");

            const character = characterManager.getCharacterByName(
                interaction.guild.id,
                interaction.user.id,
                characterName
            );

            if (!character) {
                return interaction.reply({
                    content: "❌ Personnage introuvable.",
                    ephemeral: true
                });
            }

            const aliases = aliasManager.getAliases(character.id);

            if (aliases.length === 0) {
                return interaction.reply({
                    content:
                        `ℹ️ **${character.name}** ne possède aucun alias.`,
                    ephemeral: true
                });
            }

            const list = aliases
                .map(item => `• ${item.alias}`)
                .join("\n");

            return interaction.reply({
                content: `## 🏷️ Alias de ${character.name}\n\n${list}`,
                ephemeral: true
            });
        }
        if (subcommand === "supprimer") {
    const characterName = interaction.options.getString("personnage");
    const alias = interaction.options.getString("alias");

    const character = characterManager.getCharacterByName(
        interaction.guild.id,
        interaction.user.id,
        characterName
    );

    if (!character) {
        return interaction.reply({
            content: "❌ Personnage introuvable.",
            ephemeral: true
        });
    }

    const aliases = aliasManager.getAliases(character.id);

    const exists = aliases.some(
        item => item.alias.toLowerCase() === alias.trim().toLowerCase()
    );

    if (!exists) {
        return interaction.reply({
            content: `❌ L’alias **${alias}** n’existe pas pour **${character.name}**.`,
            ephemeral: true
        });
    }

    aliasManager.removeAlias(character.id, alias);

    return interaction.reply({
        content: `✅ Alias supprimé : **${alias}** pour **${character.name}**.`,
        ephemeral: true
    });
}
    }
};