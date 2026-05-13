/**
 * commands/painel.js
 * Envia o painel de abertura de tickets no canal configurado.
 * Restrito a admins / cargo de staff.
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds  = require('../utils/embeds');
const perms   = require('../utils/permissions');
const { ticketTypeMenu } = require('../handlers/ticketHandler');
const { getConfig } = require('../configs/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Envia o painel de tickets no canal configurado.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, config) {
    // Valida permissão
    if (!perms.isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [embeds.error('Você não tem permissão para usar este comando.', config)],
        ephemeral: true,
      });
    }

    // Decide onde enviar
    let targetChannel = interaction.channel;
    if (config.panel_channel_id) {
      const configured = interaction.guild.channels.cache.get(config.panel_channel_id);
      if (configured) targetChannel = configured;
    }

    await targetChannel.send({
      embeds:     [embeds.panel(config)],
      components: [ticketTypeMenu()],
    });

    return interaction.reply({
      embeds:    [embeds.success(`Painel enviado em ${targetChannel}.`, config)],
      ephemeral: true,
    });
  },
};
