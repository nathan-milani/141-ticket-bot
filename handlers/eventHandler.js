/**
 * handlers/eventHandler.js
 * Carrega todos os arquivos de evento da pasta /events
 * e os registra no client.
 */

const fs   = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

/**
 * @param {Client} client
 */
function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  let loaded = 0;
  for (const file of files) {
    try {
      const event = require(path.join(eventsPath, file));
      if (!event.name || !event.execute) {
        logger.warn(`Evento inválido ignorado: ${file}`);
        continue;
      }
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      loaded++;
    } catch (err) {
      logger.error(`Erro ao carregar evento ${file}`, err);
    }
  }
  logger.success(`${loaded} evento(s) carregado(s).`);
}

module.exports = { loadEvents };
