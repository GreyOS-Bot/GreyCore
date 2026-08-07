module.exports = async interaction => {
    if (!interaction.isButton?.()) return false;
    if (interaction.customId !== "staff_close") return false;

    await interaction.update({
        content: "✅ Centre d'administration fermé.",
        embeds: [],
        components: []
    });
    return true;
};
