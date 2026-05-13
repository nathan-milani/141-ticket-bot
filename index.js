/**
 * index.js
 * Ponto de entrada do bot.
 * Inicializa o client, carrega handlers e faz login.
 */

require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs     = require('fs-extra');
const path   = require('path');
const logger = require('./utils/logger');

// ── Valida variáveis obrigatórias ────────────────────────────
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  logger.error('DISCORD_TOKEN e CLIENT_ID são obrigatórios no arquivo .env');
  process.exit(1);
}

// ── Garante diretórios necessários ───────────────────────────
['data', 'temp', 'downloads', 'transcripts'].forEach(dir => {
  fs.ensureDirSync(path.join(__dirname, dir));
});

// ── Cria o client ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// Collection para slash commands
client.commands = new Collection();

// ── Carrega handlers ──────────────────────────────────────────
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents   } = require('./handlers/eventHandler');

loadCommands(client);
loadEvents(client);

// ── Registra listeners adicionais dos comandos ───────────────
// O comando /config precisa registrar listeners de eventos customizados
const configCommand = require('./commands/config');
configCommand.registerConfigListeners(client);

// ── Prevenção global de crash ─────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});

// ── Login ─────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN)
  .then(() => logger.info('Conectando ao Discord…'))
  .catch(err => {
    logger.error('Falha no login. Verifique seu DISCORD_TOKEN.', err);
    process.exit(1);
  });
