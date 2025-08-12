-- TraceTrip Database Schema
-- SQLite database for offline-first corporate travel management

-- Users table
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatarUrl TEXT,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Routes table
CREATE TABLE IF NOT EXISTS rotas (
  id TEXT PRIMARY KEY,
  origem TEXT NOT NULL,
  destino TEXT NOT NULL,
  partidaAt TEXT NOT NULL,
  chegadaAt TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planejada', 'em_andamento', 'concluida', 'cancelada')),
  detalhes TEXT,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Schedules table
CREATE TABLE IF NOT EXISTS agendas (
  id TEXT PRIMARY KEY,
  rotaId TEXT NOT NULL,
  titulo TEXT NOT NULL,
  inicioAt TEXT NOT NULL,
  fimAt TEXT NOT NULL,
  local TEXT,
  descricao TEXT,
  lembreteMin INTEGER,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (rotaId) REFERENCES rotas(id) ON DELETE CASCADE
);

-- Expenses table
CREATE TABLE IF NOT EXISTS despesas (
  id TEXT PRIMARY KEY,
  rotaId TEXT NOT NULL,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('alimentacao', 'transporte', 'hospedagem', 'combustivel', 'outros')),
  valor REAL NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  data TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('rascunho', 'enviada', 'aprovada', 'rejeitada')),
  imageUri TEXT,
  ocrJson TEXT,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  pendingSync INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (rotaId) REFERENCES rotas(id) ON DELETE CASCADE
);

-- Incidents table
CREATE TABLE IF NOT EXISTS ocorrencias (
  id TEXT PRIMARY KEY,
  rotaId TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  dataHora TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  imageUri TEXT,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  pendingSync INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (rotaId) REFERENCES rotas(id) ON DELETE CASCADE
);

-- Sync queue table
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  data TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  retryCount INTEGER NOT NULL DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_despesas_rotaId ON despesas(rotaId);
CREATE INDEX IF NOT EXISTS idx_despesas_pendingSync ON despesas(pendingSync);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_rotaId ON ocorrencias(rotaId);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_pendingSync ON ocorrencias(pendingSync);
CREATE INDEX IF NOT EXISTS idx_agendas_rotaId ON agendas(rotaId);
CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON sync_queue(timestamp);