/**
 * 数据库 Schema（SQL）
 * 使用 Electron 内置的 node:sqlite（无需 better-sqlite3，无需原生编译）
 */
export const SCHEMA_SQL = /* sql */ `
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('openai', 'azure', 'anthropic')),
  base_url TEXT NOT NULL,
  api_key_encrypted BLOB,
  bearer_token_encrypted BLOB,
  wire_api TEXT NOT NULL DEFAULT 'completions' CHECK (wire_api IN ('completions', 'responses')),
  azure_api_version TEXT,
  model TEXT NOT NULL,
  icon TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS providers_order_idx ON providers("order");
CREATE INDEX IF NOT EXISTS providers_active_idx ON providers(is_active);

CREATE TABLE IF NOT EXISTS health_checks (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('ok', 'fail', 'pending')),
  latency_ms INTEGER,
  error TEXT,
  checked_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS health_checks_provider_idx ON health_checks(provider_id);
CREATE INDEX IF NOT EXISTS health_checks_checked_at_idx ON health_checks(checked_at);

CREATE TABLE IF NOT EXISTS usage_stats (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  model TEXT,
  latency_ms INTEGER NOT NULL,
  success INTEGER NOT NULL,
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS usage_stats_provider_idx ON usage_stats(provider_id);
CREATE INDEX IF NOT EXISTS usage_stats_recorded_at_idx ON usage_stats(recorded_at);
`;

/** Provider 行（与 SQL 列对应） */
export interface ProviderRow {
  id: string;
  name: string;
  type: 'openai' | 'azure' | 'anthropic';
  base_url: string;
  api_key_encrypted: Buffer | null;
  bearer_token_encrypted: Buffer | null;
  wire_api: 'completions' | 'responses';
  azure_api_version: string | null;
  model: string;
  icon: string | null;
  order: number;
  is_active: number; // 0 | 1
  created_at: number;
  updated_at: number;
}

export interface HealthCheckRow {
  id: string;
  provider_id: string;
  status: 'ok' | 'fail' | 'pending';
  latency_ms: number | null;
  error: string | null;
  checked_at: number;
}

export interface UsageStatRow {
  id: string;
  provider_id: string;
  model: string | null;
  latency_ms: number;
  success: number; // 0 | 1
  recorded_at: number;
}
