/**
 * commands/adicionar.js
 * Adiciona um usuário ao ticket pelo ID do Discord.
 */

const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../utils/embeds');
const db     = require('../configs/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adicionar')
    .setDescription('Adiciona um usuário a este ticket.')
    .addStringOption(o =>
      o.setName('userid').setDescription('ID do Discord do usuário').setRequired(true)
    ),

  async execute(interaction, config) {
    const ticket = db.getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        embeds: [embeds.error('Este canal não é um ticket.', config)],
        ephemeral: true,
      });
    }

    const userId = interaction.options.getString('userid').trim();
    let member;
    try {
      member = await interaction.guild.members.fetch(userId);
    } catch {
      return interaction.reply({
        embeds: [embeds.error(`Usuário com ID \`${userId}\` não encontrado neste servidor.`, config)],
        ephemeral: true,
      });
    }

    await interaction.channel.permissionOverwrites.edit(member.id, {
      ViewChannel:        true,
      SendMessages:       true,
      AttachFiles:        true,
      EmbedLinks:         true,
      ReadMessageHistory: true,
    });

    return interaction.reply({
      embeds: [embeds.success(`${member} foi **adicionado** ao ticket.`, config)],
    });
  },
};
