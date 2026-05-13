/**
 * commands/fechar.js
 * Fecha o ticket atual via slash command (alternativa ao botão).
 */

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const embeds = require('../utils/embeds');
const db     = require('../configs/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fechar')
    .setDescription('Fecha este ticket.')
    .addStringOption(o =>
      o.setName('motivo').setDescription('Motivo do fechamento').setRequired(false)
    ),

  async execute(interaction, config) {
    const ticket = db.getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        embeds: [embeds.error('Este canal não é um ticket.', config)],
        ephemeral: true,
      });
    }

    const reason = interaction.options.getString('motivo');

    if (!reason) {
      // Sem motivo: mostra modal
      const modal = new ModalBuilder()
        .setCustomId(`modal_close_${ticket.ticket_id}`)
        .setTitle('Fechar Ticket');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('close_reason')
            .setLabel('Motivo do fechamento (opcional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('Ex: Problema resolvido…')
            .setMaxLength(500)
        )
      );
      return interaction.showModal(modal);
    }

    // Com motivo fornecido diretamente
    await interaction.deferReply({ ephemeral: true });
    const { closeTicket } = require('../handlers/ticketHandler');
    const result = await closeTicket(interaction.channel, interaction.user, reason, config);

    if (result.error) {
      return interaction.editReply({ embeds: [embeds.error(result.error, config)] });
    }
    return interaction.editReply({ embeds: [embeds.success('Ticket encerrado.', config)] });
  },
};
