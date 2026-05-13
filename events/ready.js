/**
 * events/ready.js
 * Disparado quando o bot fica online.
 */

const { Events, ActivityType } = require('discord.js');
const cron   = require('node-cron');
const logger = require('../utils/logger');
const { purgeExpiredTickets } = require('../handlers/ticketHandler');

module.exports = {
  name:  Events.ClientReady,
  once:  true,

  async execute(client) {
    logger.success(`Bot online como ${client.user.tag}`);
    logger.info(`Presente em ${client.guilds.cache.size} servidor(es).`);

    // Status do bot
    client.user.setPresence({
      activities: [{ name: '🎫 Sistema de Tickets', type: ActivityType.Watching }],
      status: 'online',
    });

    // Verifica tickets expirados ao iniciar
    await purgeExpiredTickets();

    // Agenda limpeza diária às 03:00
    cron.schedule('0 3 * * *', async () => {
      logger.info('Rotina de limpeza automática iniciada…');
      await purgeExpiredTickets();
    });

    logger.info('Rotina de limpeza agendada para 03:00 diariamente.');
  },
};
