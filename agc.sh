#!/usr/bin/env bash

# ==========================================================
# AGC Finance - Unified Termux / Linux Launcher Script
# Funciona em qualquer diretório (detecta automaticamente o caminho)
# ==========================================================

# Resolve o caminho do projeto dinamicamente
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SANDBOX_DIR="$PROJECT_ROOT/artifacts/mockup-sandbox"

# Cores para o terminal Termux
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}${BOLD}====================================================${NC}"
echo -e "${CYAN}${BOLD}       🚀 AGC FINANCE - CENTRAL DE INICIALIZAÇÃO    ${NC}"
echo -e "${CYAN}${BOLD}====================================================${NC}"
echo -e "${BLUE}📍 Diretório Atual:${NC} $PROJECT_ROOT"
echo -e ""

# Se um argumento foi passado diretamente
MODE="$1"

if [ -z "$MODE" ]; then
  echo -e "${BOLD}Selecione o modo de execução desejado:${NC}"
  echo ""
  echo -e "  ${GREEN}1)${NC} ${BOLD}Modo Desenvolvimento (Dev Server + API Express)${NC}"
  echo -e "     -> Hot reload ativo no Vite na porta 3000"
  echo ""
  echo -e "  ${YELLOW}2)${NC} ${BOLD}Realizar apenas Build${NC}"
  echo -e "     -> Compila os arquivos estáticos para produção"
  echo ""
  echo -e "  ${BLUE}3)${NC} ${BOLD}Modo Produção COM Build${NC}"
  echo -e "     -> Executa o build e inicia o servidor Node.js/Express"
  echo ""
  echo -e "  ${CYAN}4)${NC} ${BOLD}Modo Produção SEM Build (Servidor Direto)${NC}"
  echo -e "     -> Inicia instantaneamente o servidor Express existente"
  echo ""
  echo -e "  ${RED}5)${NC} Sair"
  echo ""
  read -p "Digite a opção desejada [1-5]: " CHOICE
  echo ""
else
  CHOICE="$MODE"
fi

cd "$PROJECT_ROOT" || exit 1

case "$CHOICE" in
  1|dev|development)
    echo -e "${GREEN}▶ Iniciando em Modo Desenvolvimento (Vite + Express API)...${NC}"
    echo -e "${CYAN}Acesse no navegador: http://localhost:3000${NC}\n"
    npm run dev
    ;;
  2|build)
    echo -e "${YELLOW}▶ Gerando Build e Iniciando Servidor...${NC}"
    npm run build && cd "$SANDBOX_DIR" && node server.ts
    ;;
  3|prod|production)
    echo -e "${BLUE}▶ Gerando Build e Iniciando Servidor Express de Produção...${NC}"
    npm run build && cd "$SANDBOX_DIR" && node server.ts
    ;;
  4|start|nobuild)
    echo -e "${CYAN}▶ Iniciando Servidor Express diretamente (Sem Rebuild)...${NC}"
    echo -e "${GREEN}Acesse a API / App em: http://localhost:3000${NC}\n"
    cd "$SANDBOX_DIR" && node server.ts
    ;;
  5|exit)
    echo -e "${YELLOW}Operação cancelada.${NC}"
    exit 0
    ;;
  *)
    echo -e "${RED}Opção inválida! Encerrando.${NC}"
    exit 1
    ;;
esac
