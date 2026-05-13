/**
 * deploy-commands.js
 * Registra todos os slash commands globalmente na API do Discord.
 * Execute: node deploy-commands.js
 */

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs   = require('fs-extra');
const path = require('path');

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error('❌  DISCORD_TOKEN e CLIENT_ID são obrigatórios no .env');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of files) {
  const command = require(path.join(commandsPath, file));
  if (command.data) {
    commands.push(command.data.toJSON());
    console.log(`  ✔  Carregado: /${command.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`\n⏳  Registrando ${commands.length} comando(s) globalmente…`);

    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log(`\n✅  ${data.length} comando(s) registrado(s) com sucesso!`);
    console.log('ℹ️   Comandos globais podem levar até 1 hora para aparecer em todos os servidores.\n');
  } catch (err) {
    console.error('\n❌  Erro ao registrar comandos:', err);
    process.exit(1);
  }
})();
