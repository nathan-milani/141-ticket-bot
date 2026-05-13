/**
 * commands/remover.js
 * Remove um usuário do ticket pelo ID do Discord.
 */

const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../utils/embeds');
const db     = require('../configs/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remover')
    .setDescription('Remove um usuário deste ticket.')
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

    // Impede remover o dono do ticket
    if (userId === ticket.user_id) {
      return interaction.reply({
        embeds: [embeds.error('Não é possível remover o criador do ticket.', config)],
        ephemeral: true,
      });
    }

    let member;
    try {
      member = await interaction.guild.members.fetch(userId);
    } catch {
      return interaction.reply({
        embeds: [embeds.error(`Usuário com ID \`${userId}\` não encontrado.`, config)],
        ephemeral: true,
      });
    }

    await interaction.channel.permissionOverwrites.edit(member.id, {
      ViewChannel:  false,
      SendMessages: false,
    });

    return interaction.reply({
      embeds: [embeds.success(`${member} foi **removido** do ticket.`, config)],
    });
  },
};
