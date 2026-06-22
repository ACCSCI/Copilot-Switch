/**
 * node:sqlite 的间接加载
 * 用 createRequire 避开 vite 的静态 import-analysis
 */
import { createRequire } from 'node:module';
import type { DatabaseSync as DBType, StatementSync as SType, constants as CType, backup as BType } from 'node:sqlite';

const nodeRequire = createRequire(import.meta.url);

// 用变量拼接隐藏 node: 前缀，让 vite 解析失败时只影响这一行
const proto = ['node', ':sqlite'].join('');
const mod = nodeRequire(proto) as {
  DatabaseSync: typeof DBType;
  StatementSync: typeof SType;
  constants: typeof CType;
  backup: typeof BType;
};

export const DatabaseSync = mod.DatabaseSync;
export const StatementSync = mod.StatementSync;
export const constants = mod.constants;
export const backup = mod.backup;
export type DatabaseSyncT = DBType;
