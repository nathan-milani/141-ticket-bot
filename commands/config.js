/**
 * commands/config.js
 * Painel de configuração completo via Discord.
 * Usa select menus, modais e botões — sem editar código ou .env.
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const embeds   = require('../utils/embeds');
const perms    = require('../utils/permissions');
const { getConfig, setConfig } = require('../configs/database');
const logger   = require('../utils/logger');

// ── Select menu principal do /config ────────────────────────
function buildConfigMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('config_menu_select')
      .setPlaceholder('Selecione o que deseja configurar…')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Nome da Loja')
          .setDescription('Altere o nome e descrição do sistema.')
          .setValue('store_name')
          .setEmoji('🏪'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Cargo de Staff')
          .setDescription('Configure o cargo que terá acesso aos tickets.')
          .setValue('staff_role')
          .setEmoji('👥'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Categoria — Tickets Abertos')
          .setDescription('Categoria onde os tickets abertos são criados.')
          .setValue('cat_open')
          .setEmoji('📂'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Categoria — Tickets Fechados')
          .setDescription('Categoria para onde os tickets vão ao fechar.')
          .setValue('cat_closed')
          .setEmoji('🗄️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Canal de Logs')
          .setDescription('Canal onde os logs de tickets são enviados.')
          .setValue('log_channel')
          .setEmoji('📋'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Canal do Painel')
          .setDescription('Canal onde o /painel será enviado.')
          .setValue('panel_channel')
          .setEmoji('🎫'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Footer Personalizada')
          .setDescription('Texto exibido no rodapé de todas as embeds.')
          .setValue('footer_text')
          .setEmoji('✏️'),
      )
  );
}

// Modais por tipo de configuração
const CONFIG_MODALS = {
  store_name: {
    title: '🏪 Nome da Loja',
    fields: [
      { id: 'store_name',   label: 'Nome da Loja',       placeholder: 'Ex: Minha Loja Discord', style: TextInputStyle.Short, max: 60 },
      { id: 'system_name',  label: 'Nome do Sistema',     placeholder: 'Ex: Sistema de Tickets',  style: TextInputStyle.Short, max: 60 },
    ],
  },
  staff_role: {
    title: '👥 Cargo de Staff',
    fields: [
      { id: 'staff_role_id', label: 'ID do Cargo de Staff', placeholder: 'Cole aqui o ID do cargo (clique com botão direito → Copiar ID)', style: TextInputStyle.Short, max: 30 },
    ],
  },
  cat_open: {
    title: '📂 Categoria — Tickets Abertos',
    fields: [
      { id: 'category_open_id', label: 'ID da Categoria', placeholder: 'ID da categoria de tickets abertos', style: TextInputStyle.Short, max: 30 },
    ],
  },
  cat_closed: {
    title: '🗄️ Categoria — Tickets Fechados',
    fields: [
      { id: 'category_closed_id', label: 'ID da Categoria', placeholder: 'ID da categoria de tickets fechados', style: TextInputStyle.Short, max: 30 },
    ],
  },
  log_channel: {
    title: '📋 Canal de Logs',
    fields: [
      { id: 'log_channel_id', label: 'ID do Canal de Logs', placeholder: 'ID do canal onde os logs serão enviados', style: TextInputStyle.Short, max: 30 },
    ],
  },
  panel_channel: {
    title: '🎫 Canal do Painel',
    fields: [
      { id: 'panel_channel_id', label: 'ID do Canal do Painel', placeholder: 'ID do canal onde o painel será exibido', style: TextInputStyle.Short, max: 30 },
    ],
  },
  footer_text: {
    title: '✏️ Footer Personalizada',
    fields: [
      { id: 'footer_text', label: 'Texto da footer', placeholder: 'Ex: Loja XYZ • Suporte Premium', style: TextInputStyle.Short, max: 80 },
    ],
  },
};

// ── Registra listeners customizados no client ────────────────
function registerConfigListeners(client) {
  // Select menu do /config
  client.on('configMenuSelect', async (interaction, choice, config) => {
    const modalDef = CONFIG_MODALS[choice];
    if (!modalDef) return;

    const modal = new ModalBuilder()
      .setCustomId(`modal_config_${choice}`)
      .setTitle(modalDef.title);

    for (const f of modalDef.fields) {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(f.id)
            .setLabel(f.label)
            .setStyle(f.style)
            .setPlaceholder(f.placeholder)
            .setRequired(true)
            .setMaxLength(f.max || 100)
        )
      );
    }

    await interaction.showModal(modal);
  });

  // Modal submit do /config
  client.on('configModalSubmit', async (interaction, config) => {
    const key     = interaction.customId.replace('modal_config_', '');
    const modalDef = CONFIG_MODALS[key];
    if (!modalDef) return;

    await interaction.deferReply({ ephemeral: true });

    const updates = {};
    for (const f of modalDef.fields) {
      updates[f.id] = interaction.fields.getTextInputValue(f.id);
    }

    try {
      setConfig(interaction.guild.id, updates);
      const updated = getConfig(interaction.guild.id);
      logger.info(`Config atualizada [${interaction.guild.id}] campo=${key}`);
      return interaction.editReply({
        embeds: [embeds.configMenu(updated)],
        components: [buildConfigMenu()],
      });
    } catch (err) {
      logger.error('Erro ao salvar config', err);
      return interaction.editReply({
        embeds: [embeds.error('Falha ao salvar configuração.', config)],
      });
    }
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configura o sistema de tickets para este servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, config) {
    if (!perms.isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [embeds.error('Apenas administradores podem usar este comando.', config)],
        ephemeral: true,
      });
    }

    return interaction.reply({
      embeds:     [embeds.configMenu(config)],
      components: [buildConfigMenu()],
      ephemeral:  true,
    });
  },

  registerConfigListeners,
};
