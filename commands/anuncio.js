/**
 * commands/anuncio.js
 * Comando de anúncios com modal, embed premium e @everyone.
 * Restrições: staff/admin + cooldown anti-spam.
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const embeds = require('../utils/embeds');
const perms  = require('../utils/permissions');
const db     = require('../configs/database');

// Cooldown por guild (ms)
const COOLDOWN_MS = 60 * 1000; // 1 minuto
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anuncio')
    .setDescription('Envia um anúncio para o servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, config) {
    if (!perms.isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [embeds.error('Sem permissão.', config)],
        ephemeral: true,
      });
    }

    // Cooldown
    const guildId = interaction.guild.id;
    const now = Date.now();
    if (cooldowns.has(guildId) && now - cooldowns.get(guildId) < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - cooldowns.get(guildId))) / 1000);
      return interaction.reply({
        embeds: [embeds.error(`Aguarde **${remaining}s** antes de enviar outro anúncio.`, config)],
        ephemeral: true,
      });
    }

    cooldowns.set(guildId, now);

    // Modal para coletar dados do anúncio
    const modal = new ModalBuilder()
      .setCustomId('modal_anuncio')
      .setTitle('📢 Novo Anúncio');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('anuncio_title')
          .setLabel('Título do anúncio')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
          .setPlaceholder('Ex: Nova atualização disponível!')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('anuncio_desc')
          .setLabel('Conteúdo do anúncio')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(2000)
          .setPlaceholder('Descreva o anúncio aqui… Você pode usar markdown do Discord.')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('anuncio_image')
          .setLabel('URL da imagem (opcional)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder('https://exemplo.com/imagem.png')
      )
    );

    return interaction.showModal(modal);
  },
};
