/**
 * commands/mover.js
 * Move o ticket para uma categoria diferente do Discord.
 */

const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../utils/embeds');
const perms  = require('../utils/permissions');
const db     = require('../configs/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mover')
    .setDescription('Move este ticket para outra categoria.')
    .addStringOption(o =>
      o.setName('categoria_id')
       .setDescription('ID da categoria de destino')
       .setRequired(true)
    ),

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

    const categoryId = interaction.options.getString('categoria_id').trim();
    const category   = interaction.guild.channels.cache.get(categoryId);

    if (!category || category.type !== 4 /* GuildCategory */) {
      return interaction.reply({
        embeds: [embeds.error(`ID \`${categoryId}\` não é uma categoria válida.`, config)],
        ephemeral: true,
      });
    }

    await interaction.channel.setParent(categoryId, { lockPermissions: false });

    return interaction.reply({
      embeds: [embeds.success(`Ticket movido para a categoria **${category.name}**.`, config)],
    });
  },
};
