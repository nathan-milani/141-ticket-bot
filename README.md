# 🎫 Discord Ticket Bot — Sistema Premium

Sistema completo de tickets para lojas Discord, com suporte, financeiro, anúncios, logs, transcripts e gerenciamento moderno via Discord.

---

## 📁 Estrutura do Projeto

```
discord-ticket-bot/
├── commands/
│   ├── painel.js         # Envia o painel de tickets
│   ├── fechar.js         # Fecha o ticket atual
│   ├── adicionar.js      # Adiciona usuário ao ticket por ID
│   ├── remover.js        # Remove usuário do ticket
│   ├── mover.js          # Move ticket para outra categoria
│   ├── alertar.js        # Envia DM ao cliente do ticket
│   ├── anuncio.js        # Cria e envia anúncios
│   └── config.js         # Painel de configuração completo
├── events/
│   ├── ready.js          # Bot online + cron de limpeza
│   └── interactionCreate.js  # Roteador central de interações
├── handlers/
│   ├── commandHandler.js # Carrega comandos dinamicamente
│   ├── eventHandler.js   # Carrega eventos dinamicamente
│   └── ticketHandler.js  # Lógica completa do ciclo de tickets
├── utils/
│   ├── embeds.js         # Fábrica central de embeds premium
│   ├── permissions.js    # Validação de permissões
│   └── logger.js         # Logger de console colorido
├── configs/
│   └── database.js       # SQLite — configurações e tickets
├── data/                 # Banco SQLite (criado automaticamente)
├── transcripts/          # Transcripts HTML por ticket
├── downloads/            # Arquivos baixados
├── temp/                 # ZIPs temporários
├── index.js              # Ponto de entrada
├── deploy-commands.js    # Registra slash commands
├── package.json
└── .env.example
```

---

## ⚙️ Requisitos

- **Node.js 18+**
- Conta de desenvolvedor Discord
- Bot criado em [discord.com/developers/applications](https://discord.com/developers/applications)

---

## 🚀 Instalação

### 1. Clone ou extraia o projeto

```bash
cd discord-ticket-bot
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o `.env`

Copie o arquivo de exemplo e preencha:

```bash
cp .env.example .env
```

Edite o `.env`:
```env
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=seu_client_id_aqui
```

> **Como obter:**
> - `DISCORD_TOKEN`: Portal do Desenvolvedor → seu app → **Bot** → **Reset Token**
> - `CLIENT_ID`: Portal do Desenvolvedor → seu app → **General Information** → **Application ID**

### 4. Configure as permissões do bot

No Portal do Desenvolvedor → **OAuth2 → URL Generator**:

**Scopes:** `bot` + `applications.commands`

**Permissões do bot:**
- Manage Channels
- Manage Roles
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Add Reactions
- View Channels
- Manage Messages

### 5. Ative os Intents privilegiados

Portal do Desenvolvedor → **Bot** → ative:
- ✅ **Server Members Intent**
- ✅ **Message Content Intent**

### 6. Registre os slash commands

```bash
node deploy-commands.js
```

> ⚠️ Comandos globais podem levar até **1 hora** para aparecer em todos os servidores.

### 7. Inicie o bot

```bash
npm start
```

---

## 🔧 Configuração pelo Discord

Após iniciar o bot, **não edite nenhum arquivo**. Use `/config` diretamente no Discord:

```
/config
```

Um painel interativo com select menu aparecerá. Configure:

| Configuração             | Descrição |
|--------------------------|-----------|
| 🏪 Nome da Loja          | Nome e título do sistema |
| 👥 Cargo de Staff        | ID do cargo com acesso total |
| 📂 Categoria Abertos     | ID da categoria de tickets abertos |
| 🗄️ Categoria Fechados   | ID da categoria de tickets fechados |
| 📋 Canal de Logs         | ID do canal para logs |
| 🎫 Canal do Painel       | ID do canal do painel |
| ✏️ Footer               | Texto do rodapé das embeds |

> **Como copiar IDs:** Ative o **Modo Desenvolvedor** (Configurações → Avançado) → clique com botão direito em qualquer canal/categoria/cargo → **Copiar ID**

---

## 💬 Comandos Disponíveis

| Comando       | Descrição | Permissão |
|---------------|-----------|-----------|
| `/config`     | Abre o painel de configuração completo | Admin |
| `/painel`     | Envia o painel de abertura de tickets | Staff |
| `/fechar`     | Fecha o ticket atual com motivo | Todos (no ticket) |
| `/adicionar`  | Adiciona usuário ao ticket por ID | Staff |
| `/remover`    | Remove usuário do ticket | Staff |
| `/mover`      | Move ticket para outra categoria | Staff |
| `/alertar`    | Envia DM ao cliente avisando sobre resposta | Staff |
| `/anuncio`    | Cria e envia anúncio com embed premium | Staff |

---

## 🎫 Fluxo de Tickets

1. Staff usa `/painel` → painel aparece no canal configurado
2. Usuário clica no select menu → escolhe **Suporte** ou **Financeiro**
3. Canal privado criado: `suporte-usuario` ou `financeiro-usuario`
4. Embed de boas-vindas + botões aparecem no canal
5. Staff pode:
   - 🔔 **Alertar** → DM para o cliente
   - 👤 **Assumir** → registra responsável
   - 🔒 **Fechar** → modal de motivo → transcript + ZIP → logs → move/deleta canal
6. Após 14 dias, arquivos são deletados automaticamente

---

## 📁 Transcripts e Arquivos

Ao fechar um ticket:
- Transcript HTML gerado com todas as mensagens
- Anexos baixados automaticamente
- ZIP criado: `ticket-usuario-dd-mm-yyyy.zip`
- ZIP enviado no canal de logs
- Após **14 dias**: tudo deletado automaticamente

---

## 🔄 Limpeza Automática

- Verificação executada ao iniciar o bot
- Cron diário às **03:00** (horário do servidor)
- Remove transcripts, ZIPs e anexos de tickets com mais de 14 dias

---

## 🛠️ Expansão Futura

A estrutura modular permite adicionar facilmente:
- Novos tipos de ticket (adicionar opção em `ticketHandler.js → ticketTypeMenu()`)
- Novos comandos (criar arquivo em `commands/`)
- Novos eventos (criar arquivo em `events/`)
- Painel web de administração
- Sistema de avaliação/rating
- Integrações com APIs externas

---

## ❓ Problemas Comuns

| Problema | Solução |
|----------|---------|
| Comandos não aparecem | Aguarde até 1h após `node deploy-commands.js` |
| Bot não cria canais | Verifique permissão "Manage Channels" e se a categoria foi configurada |
| DM não enviada | Usuário tem DMs desativadas — erro tratado pelo bot |
| `Cannot find module 'better-sqlite3'` | Execute `npm install` novamente |
| Transcript vazio | Verifique a permissão "Read Message History" |
