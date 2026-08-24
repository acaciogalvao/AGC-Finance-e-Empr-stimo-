---
name: AGC Finance — Metro crash após pnpm install
description: pnpm cria dirs _tmp_NNN durante extração de pacotes; Metro tenta observá-los mas eles já foram removidos, causando ENOENT e crash.
---

## Regra
Sempre que instalar pacotes novos no projeto agc-finance, rodar `rm -rf .expo node_modules/.cache` antes de reiniciar o workflow do Metro.

**Why:** pnpm extrai pacotes em dirs temporários (`<pkg>_tmp_NNN`) que são apagados após a instalação. O Metro inicia o watcher de filesystem antes desses dirs serem limpos e lança ENOENT, derrubando o servidor.

**How to apply:** Após qualquer `pnpm add` no artifact agc-finance, executar o cleanup e só então reiniciar o workflow `artifacts/agc-finance: expo`.

## Versões corretas para expo@54
Ao instalar pacotes expo que não estavam no projeto original, usar as versões esperadas pelo expo-doctor:
- expo-file-system: ~19.0.23
- expo-local-authentication: ~17.0.8
- expo-notifications: ~0.32.17
- expo-sharing: ~14.0.8
