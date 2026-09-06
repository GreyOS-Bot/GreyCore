const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const policy = require('../../core/policies/StaffPermissionPolicy');
const { replyError } = require('../../core/services/InteractionResponseService');
const { contexts } = require('../../services/contexts');

function root(interaction) {
    return Boolean(interaction.guildId && policy.canManagePermissions(interaction));
}
function button(id, label, disabled = false) {
    return new ButtonBuilder().setCustomId(id).setLabel(label)
        .setStyle(ButtonStyle.Secondary).setDisabled(disabled);
}
function build(interaction, position = 0) {
    if (!root(interaction)) throw new Error('Accès réservé au propriétaire et aux administrateurs.');
    const rows = contexts.listByGuild(interaction.guildId);
    const index = Math.max(0, Math.min(Number(position) || 0, rows.length - 1));
    const row = rows[index];
    const embed = new EmbedBuilder().setTitle('Contexts').setColor(0x5865F2)
        .setDescription(row ? row.description || 'Aucune description.'
            : 'Aucun contexte explicite. La compatibilité actuelle est conservée ; un défaut sera créé à la demande.');
    if (row) embed.addFields(
        { name: 'Nom', value: row.name }, { name: 'Clé', value: row.key },
        { name: 'État', value: `${row.is_active ? 'Actif' : 'Inactif'}${row.is_default ? ' · Par défaut' : ''}` }
    ).setFooter({ text: `${index + 1} / ${rows.length}` });
    const actions = [button('v3_context:create', 'Créer')];
    if (row) actions.push(button(`v3_context:edit:${row.id}`, 'Modifier'),
        button(`v3_context:default:${row.id}`, 'Définir par défaut', Boolean(row.is_default)));
    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(actions),
        new ActionRowBuilder().addComponents(
            button(`v3_context:list:${index - 1}`, 'Précédent', index === 0),
            button(`v3_context:list:${index + 1}`, 'Suivant', index >= rows.length - 1),
            button('page:staff:home', 'Retour staff'))], allowedMentions: { parse: [] } };
}
function modal(row) {
    const result = new ModalBuilder().setCustomId(`v3_context_submit:${row?.id || 'new'}`)
        .setTitle(row ? 'Modifier le contexte' : 'Créer un contexte');
    for (const [key, label, limit] of [['key', 'Clé', 64], ['name', 'Nom', 100], ['description', 'Description', 1000]]) {
        if (row && key === 'key') continue;
        const input = new TextInputBuilder().setCustomId(key).setLabel(label).setMaxLength(limit)
            .setRequired(key !== 'description').setStyle(key === 'description' ? TextInputStyle.Paragraph : TextInputStyle.Short);
        if (row?.[key]) input.setValue(row[key]);
        result.addComponents(new ActionRowBuilder().addComponents(input));
    }
    return result;
}
async function handle(interaction) {
    if (!root(interaction)) {
        await replyError(interaction, 'Accès réservé au propriétaire et aux administrateurs.');
        return true;
    }
    try {
        const [prefix, action, id] = interaction.customId.split(':');
        if (prefix === 'v3_context_submit') {
            const changes = { name: interaction.fields.getTextInputValue('name'),
                description: interaction.fields.getTextInputValue('description') };
            if (action === 'new') contexts.create({ guildId: interaction.guildId, ...changes,
                key: interaction.fields.getTextInputValue('key'), createdBy: interaction.user.id });
            else contexts.update(interaction.guildId, action, changes);
            await interaction.update(build(interaction));
        } else if (action === 'create') await interaction.showModal(modal());
        else if (action === 'edit') await interaction.showModal(modal(contexts.required(interaction.guildId, id)));
        else if (action === 'default') {
            contexts.setDefault(interaction.guildId, id);
            await interaction.update(build(interaction));
        } else if (action === 'list') await interaction.update(build(interaction, id));
        else await replyError(interaction, 'Action Context inconnue.');
    } catch (error) {
        await replyError(interaction, error);
    }
    return true;
}
module.exports = { build, handle };
