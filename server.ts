import path from 'path';
import fs from 'fs';
import dns from 'dns';
import express from 'express';
import { app } from './src/server/app';

// Force IPv4 first to prevent Termux background DNS resolution delays on Android
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignore on older Node versions
}

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0'; // Accept connections from any host

const distPath = path.join(process.cwd(), 'dist');
const indexHtmlPath = path.join(distPath, 'index.html');

// Check if static build exists
if (!fs.existsSync(indexHtmlPath)) {
  console.log('ℹ️ Diretório dist/ não encontrado. Execute "npm run build" antes do "npm start", ou utilize "npm run dev".');
}

// Serve static frontend files with PWA headers
app.use(express.static(distPath, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Serve public directory static files as fallback
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

// Fallback to index.html for SPA routing on non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.method !== 'GET') {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>AGC Finance - Termux</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </head>
          <body style="font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: white; padding: 2rem; line-height: 1.6;">
            <div style="max-width: 500px; margin: 0 auto; background: #1e293b; padding: 1.5rem; border-radius: 16px; border: 1px solid #334155;">
              <h1 style="color: #10b981; margin-top: 0;">🚀 AGC Finance no Termux</h1>
              <p>O servidor backend está rodando com sucesso!</p>
              <p>Para abrir a interface completa no seu navegador:</p>
              <ol style="background: #0f172a; padding: 1rem 1.5rem; border-radius: 8px;">
                <li>No Termux, execute primeiro: <code style="color: #34d399;">npm run build</code></li>
                <li>Em seguida, inicie: <code style="color: #34d399;">npm start</code></li>
                <li>Ou para modo desenvolvimento rápido: <code style="color: #34d399;">npm run dev</code></li>
              </ol>
              <p>Dica para Termux no Android: Digite <code style="color: #34d399;">termux-wake-lock</code> no Termux para evitar que o Android pause a execução em segundo plano!</p>
              <p>Status da API: <a href="/api/health" style="color: #34d399;">/api/health</a></p>
            </div>
          </body>
        </html>
      `);
    }
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`=================================================`);
  console.log(`🚀 Servidor Express rodando na porta ${PORT}`);
  console.log(`🌐 Escutando no host: ${HOST} (qualquer IP / host)`);
  console.log(`📡 Endpoints API disponíveis em http://localhost:${PORT}/api/health`);
  console.log(`💡 Dica Termux: Use "termux-wake-lock" para manter o servidor ativo em 2º plano.`);
  console.log(`=================================================`);
});

// Avoid socket hanging in Termux background mode
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

