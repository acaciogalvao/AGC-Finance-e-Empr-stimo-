#!/usr/bin/env node

/**
 * AGC Finance - Interactive CLI Launcher for Termux & Node.js
 * Supports dev mode, build, production with build, and direct start without build.
 */

import { spawn } from 'child_process';
import readline from 'readline';
import path from 'path';
import fileSystem from 'fs';

const projectRoot = process.cwd();
const sandboxDir = path.join(projectRoot, 'artifacts', 'mockup-sandbox');

// ANSI Color Codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function clearScreen() {
  process.stdout.write('\x1Bc');
}

function runCommand(command, args, cwd = projectRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code}`));
    });
  });
}

async function start() {
  const arg = process.argv[2];

  if (arg) {
    await handleChoice(arg);
    return;
  }

  clearScreen();
  console.log(`${colors.cyan}${colors.bold}====================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}       🚀 AGC FINANCE - CENTRAL DE INICIALIZAÇÃO    ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}====================================================${colors.reset}`);
  console.log(`${colors.blue}📍 Pasta do Projeto:${colors.reset} ${projectRoot}\n`);

  console.log(`${colors.bold}Escolha o modo de execução:${colors.reset}\n`);
  console.log(`  ${colors.green}1)${colors.reset} ${colors.bold}Modo Desenvolvimento (Dev + API Express)${colors.reset}`);
  console.log(`     ${colors.dim}-> Servidor Vite com Hot Reload na porta 3000${colors.reset}\n`);
  console.log(`  ${colors.yellow}2)${colors.reset} ${colors.bold}Modo Build & Iniciar Servidor${colors.reset}`);
  console.log(`     ${colors.dim}-> Compila o frontend e inicia o servidor Node.js automaticamente${colors.reset}\n`);
  console.log(`  ${colors.blue}3)${colors.reset} ${colors.bold}Modo Produção Completo (Build + Servidor Express)${colors.reset}`);
  console.log(`     ${colors.dim}-> Roda o build e em seguida inicia o servidor Node.js${colors.reset}\n`);
  console.log(`  ${colors.cyan}4)${colors.reset} ${colors.bold}Modo Servidor Direto / SEM Build${colors.reset}`);
  console.log(`     ${colors.dim}-> Inicia o servidor Express instantaneamente (sem recompilar)${colors.reset}\n`);
  console.log(`  ${colors.red}5)${colors.reset} Sair\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(`${colors.bold}Digite a opção [1-5]: ${colors.reset}`, async (answer) => {
    rl.close();
    console.log('');
    await handleChoice(answer.trim());
  });
}

async function handleChoice(choice) {
  try {
    switch (choice) {
      case '1':
      case 'dev':
      case 'development':
        console.log(`${colors.green}▶ Iniciando em Modo Desenvolvimento...${colors.reset}`);
        console.log(`${colors.cyan}🌐 Acesse: http://localhost:3000${colors.reset}\n`);
        await runCommand('npm', ['run', 'dev']);
        break;

      case '2':
      case 'build':
        console.log(`${colors.yellow}▶ Gerando Build de Produção...${colors.reset}`);
        await runCommand('npm', ['run', 'build']);
        console.log(`\n${colors.green}✔ Build finalizado com sucesso!${colors.reset}`);
        console.log(`${colors.cyan}▶ Iniciando servidor de produção em http://localhost:3000${colors.reset}\n`);
        await runCommand('node', ['server.ts'], sandboxDir);
        break;

      case '3':
      case 'prod':
      case 'production':
        console.log(`${colors.blue}▶ Fazendo Build e iniciando Servidor de Produção...${colors.reset}`);
        await runCommand('npm', ['run', 'build']);
        console.log(`\n${colors.cyan}▶ Servidor iniciado em http://localhost:3000${colors.reset}\n`);
        await runCommand('node', ['server.ts'], sandboxDir);
        break;

      case '4':
      case 'start':
      case 'nobuild':
        console.log(`${colors.cyan}▶ Iniciando Servidor Express diretamente (Sem Build)...${colors.reset}`);
        console.log(`${colors.green}🌐 Servidor ativo em http://localhost:3000${colors.reset}\n`);
        await runCommand('node', ['server.ts'], sandboxDir);
        break;

      case '5':
      case 'exit':
        console.log(`${colors.yellow}Operação cancelada.${colors.reset}`);
        process.exit(0);
        break;

      default:
        console.log(`${colors.red}Opção inválida!${colors.reset}`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`${colors.red}Erro ao executar comando:${colors.reset}`, err.message);
  }
}

start();
