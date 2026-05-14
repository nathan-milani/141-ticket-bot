/**
 * utils/embeds.js
 * Fábrica centralizada de embeds premium para todo o sistema.
 */

const { EmbedBuilder } = require('discord.js');

// Paleta de cores do sistema
const COLORS = {
  primary:  0x000000,
  success:  0x000000,
  warning:  0x000000,
  danger:   0x000000,
  info:     0x000000,
  neutral:  0x000000,
  gold:     0x000000,
};

/**
 * Embed base — aplica footer e timestamp padrão.
 * @param {object} config  - guild_config do banco
 */
function base(config) {
  const footer = config?.footer_text || 'Sistema de Tickets Premium';
  const store  = config?.store_name  || 'Sistema';
  return new EmbedBuilder()
    .setFooter({ text: `${store} • ${footer}` })
    .setTimestamp();
}

// ── Painel ──────────────────────────────────────────────────

function panel(config) {
  const store = config?.store_name  || 'Nossa Loja';
  const sys   = config?.system_name || 'Sistema de Tickets';
  return base(config)
    .setColor(COLORS.primary)
    .setTitle(`🎫  ${sys}`)
    .setDescription(
      `> Bem-vindo ao suporte de **${store}**!\n\n` +
      `Selecione o tipo de atendimento abaixo para abrir um ticket.\n` +
      `Nossa equipe responderá o mais breve possível.`
    )
    .addFields(
      { name: '📦  Suporte',   value: 'Dúvidas, problemas técnicos e assistência geral.', inline: true },
      { name: '💰  Financeiro', value: 'Pagamentos, reembolsos e questões financeiras.',  inline: true }
    );
}

// ── Abertura de Ticket ───────────────────────────────────────

function ticketOpened(user, ticketType, ticketId, staffRole, config) {
  const typeEmoji = ticketType === 'financeiro' ? '💰' : '📦';
  const typeName  = ticketType === 'financeiro' ? 'Financeiro' : 'Suporte';
  const staffMention = staffRole ? `<@&${staffRole}>` : 'Staff';

  return base(config)
    .setColor(COLORS.primary)
    .setTitle(`${typeEmoji}  Ticket de ${typeName}`)
    .setDescription(
      `Olá, ${user}! Seu ticket foi aberto com sucesso.\n` +
      `${staffMention} estará com você em breve.`
    )
    .addFields(
      { name: '👤  Usuário',       value: `${user}`,         inline: true },
      { name: '🏷️  Tipo',          value: typeName,           inline: true },
      { name: '🆔  ID do Ticket',  value: `\`${ticketId}\``, inline: true },
      { name: '📋  Status',        value: '🟢 Aberto',        inline: true },
      { name: '👥  Staff',         value: staffMention,       inline: true },
      { name: '\u200b',            value: '\u200b',           inline: true }
    )
    .addFields({
      name: '📌  Instruções',
      value:
        '• Descreva seu problema com o máximo de detalhes\n' +
        '• Envie prints ou arquivos se necessário\n' +
        '• Aguarde a equipe — não repita a mesma mensagem',
    });
}

// ── Fechamento ───────────────────────────────────────────────

function ticketClosed(closedBy, ticketId, reason, config) {
  return base(config)
    .setColor(COLORS.danger)
    .setTitle('🔒  Ticket Encerrado')
    .setDescription(`Este ticket foi encerrado por ${closedBy}.`)
    .addFields(
      { name: '🆔  Ticket',  value: `\`${ticketId}\``,            inline: true },
      { name: '👤  Fechado', value: `${closedBy}`,                 inline: true },
      { name: '📝  Motivo',  value: reason || 'Não informado.',    inline: false }
    );
}

// ── Log de Fechamento ─────────────────────────────────────────

function ticketLog(ticket, closedBy, config) {
  const typeEmoji = ticket.ticket_type === 'financeiro' ? '💰' : '📦';
  const duration  = ticket.closed_at
    ? formatDuration(ticket.closed_at - ticket.created_at)
    : 'N/A';

  return base(config)
    .setColor(COLORS.neutral)
    .setTitle(`${typeEmoji}  Log de Ticket Fechado`)
    .addFields(
      { name: '🆔  Ticket ID',     value: `\`${ticket.ticket_id}\``,    inline: true },
      { name: '🏷️  Tipo',          value: ticket.ticket_type,            inline: true },
      { name: '👤  Usuário',       value: `<@${ticket.user_id}> (${ticket.user_tag})`, inline: false },
      { name: '🔒  Fechado por',   value: `${closedBy}`,                 inline: true },
      { name: '⏱️  Duração',       value: duration,                      inline: true },
      { name: '📋  Staff',         value: ticket.staff_tag ? `${ticket.staff_tag}` : 'Nenhum', inline: true }
    );
}

// ── DM de Alerta ─────────────────────────────────────────────

function dmAlert(guildName, channelName, config) {
  return base(config)
    .setColor(COLORS.warning)
    .setTitle('🔔  Você tem uma resposta!')
    .setDescription(
      `Sua equipe de suporte respondeu seu ticket em **${guildName}**.\n\n` +
      `📍 Canal: **${channelName}**\n\n` +
      `Acesse o servidor para continuar o atendimento.`
    );
}

// ── Anúncio ──────────────────────────────────────────────────

function announcement(author, title, description, imageUrl, config) {
  // Alteração 5: sem autor/avatar — embed limpa e minimalista
  const embed = base(config)
    .setColor(COLORS.primary)
    .setTitle(`📢  ${title}`)
    .setDescription(description);

  if (imageUrl) embed.setImage(imageUrl);
  return embed;
}

// ── Config ───────────────────────────────────────────────────

function configMenu(config) {
  return base(config)
    .setColor(COLORS.primary)
    .setTitle('⚙️  Painel de Configuração')
    .setDescription('Configure o sistema de tickets para este servidor.\nSelecione uma categoria abaixo para editar.')
    .addFields(
      { name: '🏪  Loja',                value: `Nome: \`${config.store_name || 'Não definido'}\`\nSistema: \`${config.system_name || 'Não definido'}\``, inline: true },
      { name: '👥  Staff',               value: config.staff_role_id ? `<@&${config.staff_role_id}>` : '`Não definido`', inline: true },
      { name: '📂  Categoria Suporte',   value: config.category_suporte_id    ? `\`${config.category_suporte_id}\``    : '`Não definido`', inline: true },
      { name: '💰  Categoria Financeiro', value: config.category_financeiro_id ? `\`${config.category_financeiro_id}\`` : '`Não definido`', inline: true },
      { name: '📋  Canal de Logs',       value: config.log_channel_id   ? `<#${config.log_channel_id}>`   : '`Não definido`', inline: true },
      { name: '🎫  Canal do Painel',     value: config.panel_channel_id ? `<#${config.panel_channel_id}>` : '`Não definido`', inline: true },
    );
}

// ── Genéricas ─────────────────────────────────────────────────

function success(message, config) {
  return base(config).setColor(COLORS.success).setDescription(`✅  ${message}`);
}

function error(message, config) {
  return base(config).setColor(COLORS.danger).setDescription(`❌  ${message}`);
}

function info(message, config) {
  return base(config).setColor(COLORS.info).setDescription(`ℹ️  ${message}`);
}

// ── Helpers ──────────────────────────────────────────────────

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

module.exports = {
  COLORS,
  panel,
  ticketOpened,
  ticketClosed,
  ticketLog,
  dmAlert,
  announcement,
  configMenu,
  success,
  error,
  info,
};
