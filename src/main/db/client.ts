/**
 * DB Client — 基于 Electron / Node 24+ 内置的 node:sqlite
 * 无需 better-sqlite3 / 无需原生编译
 */
import { DatabaseSync, type DatabaseSyncT } from './node-sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import { SCHEMA_SQL } from './schema.sql';

let _db: DatabaseSyncT | null = null;

/** 解析数据库文件路径 */
function resolveDbPath(): string {
  const envPath = process.env.COPILOT_SWITCH_DB;
  if (envPath) return envPath;
  const userData = process.env.ELECTRON_USER_DATA ?? safeGetUserData() ?? process.cwd();
  const dir = path.join(userData, 'data');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'copilot-switch.db');
}

function safeGetUserData(): string | null {
  try {
    return app.getPath('userData');
  } catch {
    return null;
  }
}

/** 获取（懒初始化）数据库实例 */
export function getDb(): DatabaseSyncT {
  if (_db) return _db;
  const dbPath = resolveDbPath();
  _db = new DatabaseSync(dbPath);
  _db.exec('PRAGMA journal_mode = WAL;');
  _db.exec('PRAGMA foreign_keys = ON;');
  // 初始化 schema
  _db.exec(SCHEMA_SQL);
  return _db;
}

/** 注入自定义数据库（用于测试，比如 :memory:）；传 null 仅清空 */
export function setDb(db: DatabaseSyncT | null) {
  if (db === null) {
    _db = null;
    return;
  }
  _db = db;
  _db.exec('PRAGMA foreign_keys = ON;');
  _db.exec(SCHEMA_SQL);
}

/** 关闭数据库 */
export function closeDb() {
  _db?.close();
  _db = null;
}

/** 显式运行迁移（这里就是 schema init） */
export function runMigrations() {
  getDb();
}
