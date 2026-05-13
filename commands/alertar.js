/**
 * commands/alertar.js
 * Envia uma DM ao cliente do ticket avisando que há resposta.
 */

const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../utils/embeds');
const perms  = require('../utils/permissions');
const db     = require('../configs/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alertar')
    .setDescription('Envia uma DM ao cliente avisando que há resposta no ticket.'),

  async execute(interaction, config) {
    if (!perms.isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [embeds.error('Sem permissão.', config)],
        ephemeral: true,
      });
    }

    const ticket = db.getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        embeds: [embeds.error('Este canal não é um ticket.', config)],
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const user   = await interaction.client.users.fetch(ticket.user_id);
      const dmEmbed = embeds.dmAlert(interaction.guild.name, interaction.channel.name, config);
      await user.send({ embeds: [dmEmbed] });
      return interaction.editReply({
        embeds: [embeds.success(`DM enviada com sucesso para **${user.tag}**.`, config)],
      });
    } catch {
      return interaction.editReply({
        embeds: [embeds.error('Não foi possível enviar a DM. O usuário pode ter DMs desativadas.', config)],
      });
    }
  },
};
