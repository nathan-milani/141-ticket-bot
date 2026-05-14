/**
 * configs/database.js
 * Gerencia o banco SQLite para configurações por guild e dados de tickets.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

// Garante que o diretório de dados existe
const DATA_DIR = path.join(__dirname, '..', 'data');
fs.ensureDirSync(DATA_DIR);

const DB_PATH = path.join(DATA_DIR, 'bot.db');
const db = new Database(DB_PATH);

// ── Pragma de performance ────────────────────────────────────
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Criação das tabelas ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id              TEXT PRIMARY KEY,
    store_name            TEXT DEFAULT 'Minha Loja',
    system_name           TEXT DEFAULT 'Sistema de Tickets',
    footer_text           TEXT DEFAULT 'Sistema de Tickets Premium',
    staff_role_id         TEXT,
    category_open_id      TEXT,
    category_closed_id    TEXT,
    category_suporte_id   TEXT,
    category_financeiro_id TEXT,
    log_channel_id        TEXT,
    panel_channel_id      TEXT,
    updated_at            INTEGER DEFAULT (strftime('%s','now'))
  );

  -- Migrações para banco já existente (ignora se coluna já existe)

  CREATE TABLE IF NOT EXISTS tickets (
    ticket_id         TEXT PRIMARY KEY,
    guild_id          TEXT NOT NULL,
    channel_id        TEXT NOT NULL UNIQUE,
    user_id           TEXT NOT NULL,
    user_tag          TEXT NOT NULL,
    ticket_type       TEXT NOT NULL,
    status            TEXT DEFAULT 'open',
    staff_id          TEXT,
    staff_tag         TEXT,
    created_at        INTEGER DEFAULT (strftime('%s','now')),
    closed_at         INTEGER,
    transcript_path   TEXT,
    zip_path          TEXT,
    purge_at          INTEGER
  );

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id   TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    user_tag    TEXT NOT NULL,
    content     TEXT,
    attachments TEXT,
    created_at  INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    content     TEXT,
    created_at  INTEGER DEFAULT (strftime('%s','now'))
  );
`);

// ── Migrações (bancos já existentes) ────────────────────────
const migrations = [
  `ALTER TABLE guild_config ADD COLUMN category_suporte_id TEXT`,
  `ALTER TABLE guild_config ADD COLUMN category_financeiro_id TEXT`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch { /* coluna já existe */ }
}

// ── Guild Config ─────────────────────────────────────────────

/**
 * Retorna a configuração de um servidor. Cria um registro padrão se não existir.
 * @param {string} guildId
 * @returns {object}
 */
function getConfig(guildId) {
  let config = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  if (!config) {
    db.prepare(`
      INSERT INTO guild_config (guild_id) VALUES (?)
    `).run(guildId);
    config = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  }
  return config;
}

/**
 * Atualiza um ou mais campos da configuração de um servidor.
 * @param {string} guildId
 * @param {object} fields  - { campo: valor }
 */
function setConfig(guildId, fields) {
  getConfig(guildId); // garante que o registro existe
  const keys = Object.keys(fields);
  const setClause = keys.map(k => `${k} = @${k}`).join(', ');
  db.prepare(`
    UPDATE guild_config
    SET ${setClause}, updated_at = strftime('%s','now')
    WHERE guild_id = @guild_id
  `).run({ guild_id: guildId, ...fields });
}

// ── Tickets ──────────────────────────────────────────────────

function createTicket(data) {
  db.prepare(`
    INSERT INTO tickets
      (ticket_id, guild_id, channel_id, user_id, user_tag, ticket_type)
    VALUES
      (@ticket_id, @guild_id, @channel_id, @user_id, @user_tag, @ticket_type)
  `).run(data);
}

function getTicketByChannel(channelId) {
  return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
}

function getTicketByUser(guildId, userId) {
  return db.prepare(`
    SELECT * FROM tickets
    WHERE guild_id = ? AND user_id = ? AND status = 'open'
  `).get(guildId, userId);
}

function updateTicket(ticketId, fields) {
  const keys = Object.keys(fields);
  const setClause = keys.map(k => `${k} = @${k}`).join(', ');
  db.prepare(`
    UPDATE tickets SET ${setClause} WHERE ticket_id = @ticket_id
  `).run({ ticket_id: ticketId, ...fields });
}

/**
 * Retorna tickets cujo purge_at já passou e ainda não foram apagados.
 */
function getExpiredTickets() {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    SELECT * FROM tickets
    WHERE purge_at IS NOT NULL AND purge_at < ? AND status = 'closed'
  `).all(now);
}

function deleteTicketRecord(ticketId) {
  db.prepare('DELETE FROM ticket_messages WHERE ticket_id = ?').run(ticketId);
  db.prepare('DELETE FROM tickets WHERE ticket_id = ?').run(ticketId);
}

// ── Announcements ────────────────────────────────────────────

function logAnnouncement(guildId, userId, content) {
  db.prepare(`
    INSERT INTO announcements (guild_id, user_id, content) VALUES (?, ?, ?)
  `).run(guildId, userId, content);
}

function getLastAnnouncement(guildId) {
  return db.prepare(`
    SELECT * FROM announcements WHERE guild_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(guildId);
}

module.exports = {
  db,
  getConfig,
  setConfig,
  createTicket,
  getTicketByChannel,
  getTicketByUser,
  updateTicket,
  getExpiredTickets,
  deleteTicketRecord,
  logAnnouncement,
  getLastAnnouncement,
};
