/**
 * events/interactionCreate.js
 * Roteador central de todas as interações:
 *   slash commands, botões, select menus, modais.
 */

const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const logger  = require('../utils/logger');
const embeds  = require('../utils/embeds');
const perms   = require('../utils/permissions');
const { getConfig } = require('../configs/database');
const { openTicket, closeTicket, ticketTypeMenu } = require('../handlers/ticketHandler');
const db      = require('../configs/database');

// Cooldown simples para botões (evita spam)
const cooldowns = new Map();
function hasCooldown(userId, action, ms = 3000) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  if (cooldowns.has(key) && now - cooldowns.get(key) < ms) return true;
  cooldowns.set(key, now);
  return false;
}

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    const config = interaction.guild ? getConfig(interaction.guild.id) : null;

    // ── Slash Commands ─────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, config);
      } catch (err) {
        logger.error(`Erro no comando /${interaction.commandName}`, err);
        const msg = { embeds: [embeds.error('Ocorreu um erro interno.', config)], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
      return;
    }

    // ── Select Menu — Tipo de ticket ────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_type_select') {
      if (hasCooldown(interaction.user.id, 'open')) {
        return interaction.reply({ embeds: [embeds.error('Aguarde um momento.', config)], ephemeral: true });
      }

      const ticketType = interaction.values[0]; // 'suporte' | 'financeiro'

      // Reset the select menu back to its placeholder immediately.
      // Without this, Discord keeps the chosen option highlighted and
      // the user cannot re-select the same category to open a new ticket.
      await interaction.update({ components: [ticketTypeMenu()] });

      const result = await openTicket(interaction.guild, interaction.user, ticketType, config);

      if (result.error) {
        return interaction.followUp({ embeds: [embeds.error(result.error, config)], ephemeral: true });
      }
      return interaction.followUp({
        embeds: [embeds.success(`Ticket aberto: ${result.channel}`, config)],
        ephemeral: true,
      });
    }

    // ── Botões dos Tickets ──────────────────────────────────────
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Fechar ticket
      if (id.startsWith('ticket_close_')) {
        if (hasCooldown(interaction.user.id, 'close', 5000)) {
          return interaction.reply({ embeds: [embeds.error('Aguarde.', config)], ephemeral: true });
        }

        // Modal para capturar motivo
        const modal = new ModalBuilder()
          .setCustomId(`modal_close_${id.replace('ticket_close_', '')}`)
          .setTitle('Fechar Ticket');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('close_reason')
              .setLabel('Motivo do fechamento (opcional)')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setPlaceholder('Ex: Problema resolvido, aguardando retorno…')
              .setMaxLength(500)
          )
        );
        return interaction.showModal(modal);
      }

      // Alertar cliente (DM)
      if (id.startsWith('ticket_alert_')) {
        if (hasCooldown(interaction.user.id, 'alert', 10000)) {
          return interaction.reply({ embeds: [embeds.error('Aguarde 10 segundos entre alertas.', config)], ephemeral: true });
        }

        const ticket = db.getTicketByChannel(interaction.channel.id);
        if (!ticket) return interaction.reply({ embeds: [embeds.error('Ticket não encontrado.', config)], ephemeral: true });

        await interaction.deferReply({ ephemeral: true });
        try {
          const targetUser = await interaction.client.users.fetch(ticket.user_id);
          const dmEmbed = embeds.dmAlert(interaction.guild.name, interaction.channel.name, config);
          await targetUser.send({ embeds: [dmEmbed] });
          return interaction.editReply({ embeds: [embeds.success(`DM enviada para ${targetUser.tag}.`, config)] });
        } catch (err) {
          return interaction.editReply({
            embeds: [embeds.error('Não foi possível enviar DM. O usuário pode ter DMs desativadas.', config)],
          });
        }
      }

      // Assumir ticket
      if (id.startsWith('ticket_assume_')) {
        const ticket = db.getTicketByChannel(interaction.channel.id);
        if (!ticket) return interaction.reply({ embeds: [embeds.error('Ticket não encontrado.', config)], ephemeral: true });

        db.updateTicket(ticket.ticket_id, {
          staff_id:  interaction.user.id,
          staff_tag: interaction.user.tag,
        });

        return interaction.reply({
          embeds: [embeds.info(`${interaction.user} assumiu este ticket.`, config)],
        });
      }

      // ➕ Adicionar pessoa ao ticket
      if (id.startsWith('ticket_adduser_')) {
        if (!perms.isStaff(interaction.member)) {
          return interaction.reply({ embeds: [embeds.error('Apenas staff pode adicionar pessoas.', config)], ephemeral: true });
        }

        const modal = new ModalBuilder()
          .setCustomId(`modal_adduser_${id.replace('ticket_adduser_', '')}`)
          .setTitle('➕ Adicionar Pessoa ao Ticket');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('add_user_id')
              .setLabel('ID do Usuário')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('Cole aqui o ID do Discord do usuário')
              .setMaxLength(25)
          )
        );
        return interaction.showModal(modal);
      }

      // ➖ Remover pessoa do ticket
      if (id.startsWith('ticket_removeuser_')) {
        if (!perms.isStaff(interaction.member)) {
          return interaction.reply({ embeds: [embeds.error('Apenas staff pode remover pessoas.', config)], ephemeral: true });
        }

        const modal = new ModalBuilder()
          .setCustomId(`modal_removeuser_${id.replace('ticket_removeuser_', '')}`)
          .setTitle('➖ Remover Pessoa do Ticket');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('remove_user_id')
              .setLabel('ID do Usuário')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('Cole aqui o ID do Discord do usuário')
              .setMaxLength(25)
          )
        );
        return interaction.showModal(modal);
      }
    }

    // ── Modal — adicionar pessoa ────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_adduser_')) {
      await interaction.deferReply({ ephemeral: true });
      const userId = interaction.fields.getTextInputValue('add_user_id').trim();
      let member;
      try {
        member = await interaction.guild.members.fetch(userId);
      } catch {
        return interaction.editReply({ embeds: [embeds.error(`Usuário com ID \`${userId}\` não encontrado neste servidor.`, config)] });
      }

      // Impede adicionar bots
      if (member.user.bot) {
        return interaction.editReply({ embeds: [embeds.error('Não é possível adicionar bots ao ticket.', config)] });
      }

      await interaction.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true, SendMessages: true, AttachFiles: true,
        EmbedLinks: true, ReadMessageHistory: true,
      });

      return interaction.editReply({
        embeds: [embeds.success(`${member} foi **adicionado** ao ticket.`, config)],
      });
    }

    // ── Modal — remover pessoa ────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_removeuser_')) {
      await interaction.deferReply({ ephemeral: true });
      const userId = interaction.fields.getTextInputValue('remove_user_id').trim();

      const ticket = db.getTicketByChannel(interaction.channel.id);
      if (ticket && userId === ticket.user_id) {
        return interaction.editReply({ embeds: [embeds.error('Não é possível remover o criador do ticket.', config)] });
      }

      let member;
      try {
        member = await interaction.guild.members.fetch(userId);
      } catch {
        return interaction.editReply({ embeds: [embeds.error(`Usuário com ID \`${userId}\` não encontrado.`, config)] });
      }

      await interaction.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: false, SendMessages: false,
      });

      return interaction.editReply({
        embeds: [embeds.success(`${member} foi **removido** do ticket.`, config)],
      });
    }

    // ── Modal — fechar com motivo ────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_close_')) {
      if (hasCooldown(interaction.user.id, 'modal_close', 5000)) return;

      await interaction.deferReply({ ephemeral: true });
      const reason = interaction.fields.getTextInputValue('close_reason') || 'Não informado.';
      const result = await closeTicket(interaction.channel, interaction.user, reason, config);

      if (result.error) {
        return interaction.editReply({ embeds: [embeds.error(result.error, config)] });
      }
      return interaction.editReply({ embeds: [embeds.success('Ticket encerrado com sucesso.', config)] });
    }

    // ── Modal — anúncio ──────────────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId === 'modal_anuncio') {
      await interaction.deferReply({ ephemeral: true });

      const title       = interaction.fields.getTextInputValue('anuncio_title');
      const description = interaction.fields.getTextInputValue('anuncio_desc');
      const imageUrl    = interaction.fields.getTextInputValue('anuncio_image') || null;

      const embed = embeds.announcement(interaction.user, title, description, imageUrl, config);

      await interaction.channel.send({ content: '@everyone', embeds: [embed] });
      db.logAnnouncement(interaction.guild.id, interaction.user.id, description);

      return interaction.editReply({ embeds: [embeds.success('Anúncio enviado!', config)] });
    }

    // ── Select Menu — /config ─────────────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === 'config_menu_select') {
      const choice = interaction.values[0];
      // Delegado ao comando /config via client event
      client.emit('configMenuSelect', interaction, choice, config);
      return;
    }

    // ── Modais de config ─────────────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_config_')) {
      client.emit('configModalSubmit', interaction, config);
      return;
    }
  },
};
