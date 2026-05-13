/**
 * utils/logger.js
 * Logger de console com níveis e cores.
 */

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const GRAY   = '\x1b[90m';

function timestamp() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function info(message) {
  console.log(`${GRAY}[${timestamp()}]${RESET} ${CYAN}${BOLD}INFO${RESET}  ${message}`);
}

function success(message) {
  console.log(`${GRAY}[${timestamp()}]${RESET} ${GREEN}${BOLD}OK${RESET}    ${message}`);
}

function warn(message) {
  console.warn(`${GRAY}[${timestamp()}]${RESET} ${YELLOW}${BOLD}WARN${RESET}  ${message}`);
}

function error(message, err) {
  console.error(`${GRAY}[${timestamp()}]${RESET} ${RED}${BOLD}ERROR${RESET} ${message}`);
  if (err) console.error(err);
}

function ticket(message) {
  console.log(`${GRAY}[${timestamp()}]${RESET} ${BOLD}🎫 TICKET${RESET} ${message}`);
}

module.exports = { info, success, warn, error, ticket };
