/**
 * handlers/commandHandler.js
 * Carrega todos os arquivos de comando da pasta /commands
 * e os registra na Collection do client.
 */

const fs   = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

/**
 * @param {Client} client
 */
function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  let loaded = 0;
  for (const file of files) {
    try {
      const command = require(path.join(commandsPath, file));
      if (!command.data || !command.execute) {
        logger.warn(`Comando inválido ignorado: ${file}`);
        continue;
      }
      client.commands.set(command.data.name, command);
      loaded++;
    } catch (err) {
      logger.error(`Erro ao carregar comando ${file}`, err);
    }
  }
  logger.success(`${loaded} comando(s) carregado(s).`);
}

module.exports = { loadCommands };
