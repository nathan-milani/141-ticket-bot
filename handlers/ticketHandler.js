/**
 * handlers/ticketHandler.js
 * Toda a lógica de ciclo de vida dos tickets:
 *   abrir, fechar, gerar transcript, ZIP, enviar logs, limpeza.
 */

const {
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const path = require('path');
const fs   = require('fs-extra');
const { createTranscript } = require('discord-html-transcripts');
const archiver = require('archiver');
const axios    = require('axios');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomBytes(8).toString('hex') } : require('crypto');

const db          = require('../configs/database');
const embeds      = require('../utils/embeds');
const perms       = require('../utils/permissions');
const logger      = require('../utils/logger');

// Diretórios
const TRANSCRIPTS_DIR = path.join(__dirname, '..', 'transcripts');
const DOWNLOADS_DIR   = path.join(__dirname, '..', 'downloads');
const TEMP_DIR        = path.join(__dirname, '..', 'temp');
fs.ensureDirSync(TRANSCRIPTS_DIR);
fs.ensureDirSync(DOWNLOADS_DIR);
fs.ensureDirSync(TEMP_DIR);

// Retenção em dias
const RETENTION_DAYS = 14;

// ── Gera ID de ticket legível ────────────────────────────────
function generateTicketId() {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `TKT-${ts}-${rnd}`;
}

// ── Componentes de botão do ticket aberto ────────────────────
function ticketButtons(ticketId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_alert_${ticketId}`)
      .setLabel('Alertar Cliente')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔔'),
    new ButtonBuilder()
      .setCustomId(`ticket_assume_${ticketId}`)
      .setLabel('Assumir Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👤'),
    new ButtonBuilder()
      .setCustomId(`ticket_close_${ticketId}`)
      .setLabel('Fechar Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );
}

// ── Select menu para tipo de ticket no painel ────────────────
function ticketTypeMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_type_select')
      .setPlaceholder('Selecione o tipo de atendimento…')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Suporte')
          .setDescription('Dúvidas, problemas técnicos e assistência geral.')
          .setValue('suporte')
          .setEmoji('📦'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Financeiro')
          .setDescription('Pagamentos, reembolsos e questões financeiras.')
          .setValue('financeiro')
          .setEmoji('💰')
      )
  );
}

// ── Abrir ticket ─────────────────────────────────────────────

/**
 * Cria o canal de ticket, registra no banco e envia embed de abertura.
 *
 * @param {Guild}      guild
 * @param {User}       user
 * @param {string}     ticketType  - 'suporte' | 'financeiro'
 * @param {object}     config      - guild_config do banco
 * @returns {TextChannel|null}
 */
async function openTicket(guild, user, ticketType, config) {
  // Previne ticket duplo
  const existing = db.getTicketByUser(guild.id, user.id);
  if (existing) {
    const channel = guild.channels.cache.get(existing.channel_id);
    return { error: `Você já tem um ticket aberto: ${channel ? channel.toString() : `\`${existing.ticket_id}\``}` };
  }

  const ticketId   = generateTicketId();
  const channelName = `${ticketType}-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  let channel;
  try {
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.category_open_id || null,
      topic: `${ticketId} | ${user.tag} | ${ticketType}`,
      permissionOverwrites: perms.ticketPermissions(guild, user.id, config.staff_role_id),
    });
  } catch (err) {
    logger.error('Falha ao criar canal de ticket', err);
    return { error: 'Não foi possível criar o canal. Verifique as permissões do bot.' };
  }

  // Salva no banco
  db.createTicket({
    ticket_id:   ticketId,
    guild_id:    guild.id,
    channel_id:  channel.id,
    user_id:     user.id,
    user_tag:    user.tag,
    ticket_type: ticketType,
  });

  // Envia embed de abertura + botões
  const staffMention = config.staff_role_id ? `<@&${config.staff_role_id}>` : '';
  await channel.send({
    content: `${user} ${staffMention}`,
    embeds:  [embeds.ticketOpened(user, ticketType, ticketId, config.staff_role_id, config)],
    components: [ticketButtons(ticketId)],
  });

  logger.ticket(`Aberto [${ticketId}] tipo=${ticketType} usuário=${user.tag} canal=#${channelName}`);
  return { channel, ticketId };
}

// ── Fechar ticket ────────────────────────────────────────────

/**
 * Fecha o ticket: gera transcript, baixa anexos, cria ZIP, envia log, move/deleta canal.
 *
 * @param {TextChannel} channel
 * @param {User}        closedBy
 * @param {string}      reason
 * @param {object}      config
 */
async function closeTicket(channel, closedBy, reason, config) {
  const ticket = db.getTicketByChannel(channel.id);
  if (!ticket) return { error: 'Canal não é um ticket registrado.' };
  if (ticket.status === 'closed') return { error: 'Este ticket já está fechado.' };

  const now = Math.floor(Date.now() / 1000);
  const purgeAt = now + RETENTION_DAYS * 86400;

  // Aplica permissões de ticket fechado (somente leitura)
  try {
    await channel.permissionOverwrites.set(
      perms.closedTicketPermissions(channel.guild, ticket.user_id, config.staff_role_id)
    );
  } catch (err) {
    logger.warn(`Não foi possível atualizar permissões do canal ${channel.id}: ${err.message}`);
  }

  // Embed de encerramento
  await channel.send({
    embeds: [embeds.ticketClosed(closedBy, ticket.ticket_id, reason, config)],
  });

  // ── Gerar transcript HTML ──────────────────────────────────
  let transcriptPath = null;
  let zipPath        = null;

  try {
    const transcriptFile = await createTranscript(channel, {
      limit:         -1,
      returnType:    'attachment',
      filename:      `${ticket.ticket_id}.html`,
      saveImages:    true,
      poweredBy:     false,
    });

    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const safeName = ticket.user_tag.replace(/[^a-z0-9]/gi, '_');
    const baseName = `ticket-${safeName}-${dateStr}`;

    const ticketDir = path.join(TRANSCRIPTS_DIR, ticket.ticket_id);
    fs.ensureDirSync(ticketDir);

    transcriptPath = path.join(ticketDir, `${baseName}.html`);
    fs.writeFileSync(transcriptPath, transcriptFile.attachment);

    // ── Baixar anexos ────────────────────────────────────────
    const attachmentsDir = path.join(ticketDir, 'attachments');
    fs.ensureDirSync(attachmentsDir);
    await downloadAttachments(channel, attachmentsDir);

    // ── Gerar ZIP ────────────────────────────────────────────
    zipPath = path.join(TEMP_DIR, `${baseName}.zip`);
    await createZip(ticketDir, zipPath);

    // ── Enviar log com ZIP ───────────────────────────────────
    if (config.log_channel_id) {
      const logChannel = channel.guild.channels.cache.get(config.log_channel_id);
      if (logChannel) {
        const closedTicket = { ...ticket, closed_at: now };
        await logChannel.send({
          embeds: [embeds.ticketLog(closedTicket, closedBy, config)],
          files:  [{ attachment: zipPath, name: `${baseName}.zip` }],
        });
      }
    }
  } catch (err) {
    logger.error('Falha ao gerar transcript/ZIP', err);
  }

  // ── Atualizar banco ──────────────────────────────────────────
  db.updateTicket(ticket.ticket_id, {
    status:          'closed',
    closed_at:       now,
    staff_tag:       closedBy.tag,
    transcript_path: transcriptPath,
    zip_path:        zipPath,
    purge_at:        purgeAt,
  });

  // ── Mover para categoria de fechados OU deletar ────────────
  if (config.category_closed_id) {
    try {
      await channel.setParent(config.category_closed_id, { lockPermissions: false });
      const typeEmoji = ticket.ticket_type === 'financeiro' ? '💰' : '📦';
      await channel.setName(`fechado-${ticket.ticket_type}-${ticket.user_tag.split('#')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`);
    } catch (err) {
      logger.warn(`Não foi possível mover o canal: ${err.message}`);
    }
  } else {
    // Sem categoria de fechados: aguarda 5s e deleta
    setTimeout(async () => {
      try { await channel.delete('Ticket fechado'); } catch {}
    }, 5000);
  }

  logger.ticket(`Fechado [${ticket.ticket_id}] por=${closedBy.tag} motivo="${reason}"`);
  return { success: true };
}

// ── Baixar anexos ─────────────────────────────────────────────

async function downloadAttachments(channel, destDir) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const downloads = [];

  for (const msg of messages.values()) {
    for (const attachment of msg.attachments.values()) {
      downloads.push({ url: attachment.url, name: attachment.name });
    }
  }

  for (const file of downloads) {
    try {
      const response = await axios.get(file.url, { responseType: 'arraybuffer', timeout: 15000 });
      const filePath = path.join(destDir, file.name);
      fs.writeFileSync(filePath, response.data);
    } catch (err) {
      logger.warn(`Falha ao baixar anexo ${file.name}: ${err.message}`);
    }
  }
}

// ── Criar ZIP ─────────────────────────────────────────────────

function createZip(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output  = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// ── Limpeza automática ─────────────────────────────────────────

async function purgeExpiredTickets() {
  const expired = db.getExpiredTickets();
  if (expired.length === 0) return;

  logger.info(`Limpeza automática: ${expired.length} ticket(s) expirado(s).`);

  for (const ticket of expired) {
    try {
      // Remove pasta do transcript
      const ticketDir = path.join(TRANSCRIPTS_DIR, ticket.ticket_id);
      if (fs.existsSync(ticketDir)) fs.removeSync(ticketDir);

      // Remove ZIP
      if (ticket.zip_path && fs.existsSync(ticket.zip_path)) fs.removeSync(ticket.zip_path);

      // Remove do banco
      db.deleteTicketRecord(ticket.ticket_id);
      logger.info(`  Purgado ticket ${ticket.ticket_id}`);
    } catch (err) {
      logger.error(`Erro ao purgar ticket ${ticket.ticket_id}`, err);
    }
  }
}

module.exports = {
  openTicket,
  closeTicket,
  purgeExpiredTickets,
  ticketTypeMenu,
  ticketButtons,
  generateTicketId,
};
