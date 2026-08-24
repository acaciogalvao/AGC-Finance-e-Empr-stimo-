import express from 'express';
import cors from 'cors';
import { profileRouter } from './routes/profile';
import { emprestimosRouter } from './routes/emprestimos';
import { metasRouter } from './routes/metas';
import { corridasRouter } from './routes/corridas';
import { despesasRouter } from './routes/despesas';
import { syncRouter } from './routes/sync';
import { getDBStatus, connectDB } from './db';

// Connect to MongoDB Atlas automatically
connectDB().catch((err: unknown) => console.error('[Server] DB Connection check failed:', err));

export const app = express();

// Configure CORS for ANY host / origin
app.use(
  cors({
    origin: '*', // Allows access from any host
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.url} - Host: ${req.headers.host || 'unknown'}`);
  next();
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cors: 'enabled (all hosts)',
    database: {
      connected: dbStatus.isConnected,
      configured: dbStatus.mongoUriConfigured,
      readyState: dbStatus.readyState,
    },
  });
});

// Config / Info endpoint
app.get('/api/config', (req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    appName: 'AGC Finance API',
    version: '2.0.0',
    host: req.headers.host,
    allowedOrigins: '*',
    databaseType: dbStatus.isConnected ? 'MongoDB Atlas' : 'Aguardando conexão MongoDB',
    endpoints: ['/api/health', '/api/config', '/api/sync', '/api/profile', '/api/corridas', '/api/despesas', '/api/emprestimos', '/api/metas'],
  });
});

// API Routes
app.use('/api/sync', syncRouter);
app.use('/api/profile', profileRouter);
app.use('/api/corridas', corridasRouter);
app.use('/api/despesas', despesasRouter);
app.use('/api/emprestimos', emprestimosRouter);
app.use('/api/metas', metasRouter);
