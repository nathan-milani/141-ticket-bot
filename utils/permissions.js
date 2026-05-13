/**
 * utils/permissions.js
 * Validação centralizada de permissões do sistema.
 */

const { getConfig } = require('../configs/database');

/**
 * Verifica se um membro tem permissão de staff/admin no sistema.
 * Retorna true se for administrador OU tiver o cargo de staff configurado.
 *
 * @param {GuildMember} member
 * @returns {boolean}
 */
function isStaff(member) {
  if (!member) return false;

  // Administradores sempre têm acesso
  if (member.permissions.has('Administrator')) return true;

  const config = getConfig(member.guild.id);
  if (!config.staff_role_id) return false;

  return member.roles.cache.has(config.staff_role_id);
}

/**
 * Verifica se o membro é administrador puro.
 * @param {GuildMember} member
 * @returns {boolean}
 */
function isAdmin(member) {
  if (!member) return false;
  return member.permissions.has('Administrator');
}

/**
 * Retorna os overrides de permissão base para um canal de ticket.
 * @param {Guild} guild
 * @param {string} userId       - ID do criador do ticket
 * @param {string} staffRoleId  - ID do cargo de staff (pode ser null)
 * @returns {PermissionOverwriteData[]}
 */
function ticketPermissions(guild, userId, staffRoleId) {
  const overwrites = [
    {
      id: guild.id, // @everyone
      deny: ['ViewChannel', 'SendMessages'],
    },
    {
      id: userId,   // Dono do ticket
      allow: [
        'ViewChannel',
        'SendMessages',
        'AttachFiles',
        'EmbedLinks',
        'ReadMessageHistory',
        'AddReactions',
      ],
    },
    {
      id: guild.client.user.id, // Bot
      allow: [
        'ViewChannel',
        'SendMessages',
        'AttachFiles',
        'EmbedLinks',
        'ReadMessageHistory',
        'ManageChannels',
        'ManageMessages',
      ],
    },
  ];

  if (staffRoleId) {
    overwrites.push({
      id: staffRoleId,
      allow: [
        'ViewChannel',
        'SendMessages',
        'AttachFiles',
        'EmbedLinks',
        'ReadMessageHistory',
        'ManageMessages',
        'AddReactions',
      ],
    });
  }

  return overwrites;
}

/**
 * Gera overrides para fechar (somente leitura para o usuário).
 * @param {Guild} guild
 * @param {string} userId
 * @param {string} staffRoleId
 * @returns {PermissionOverwriteData[]}
 */
function closedTicketPermissions(guild, userId, staffRoleId) {
  const overwrites = [
    {
      id: guild.id,
      deny: ['ViewChannel', 'SendMessages'],
    },
    {
      id: userId,
      allow: ['ViewChannel', 'ReadMessageHistory'],
      deny: ['SendMessages'],
    },
    {
      id: guild.client.user.id,
      allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ReadMessageHistory'],
    },
  ];

  if (staffRoleId) {
    overwrites.push({
      id: staffRoleId,
      allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
    });
  }

  return overwrites;
}

module.exports = {
  isStaff,
  isAdmin,
  ticketPermissions,
  closedTicketPermissions,
};
