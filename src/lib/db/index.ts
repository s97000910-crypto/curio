import { DatabaseSync, StatementResultingChanges } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { seedDatabase } from './seed';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  // Use curio.db in the project root
  const dbPath = path.resolve(process.cwd(), 'curio.db');
  const db = new DatabaseSync(dbPath);

  // Configure SQLite for high performance and integrity
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');

  // Seed on initial startup
  seedDatabase(db);

  dbInstance = db;
  return dbInstance;
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const db = getDb();
  const stmt = db.prepare(sql);
  const row = stmt.get(...params);
  return (row as T) || null;
}

export function execute(sql: string, params: any[] = []): StatementResultingChanges {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

export function transaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = fn(db);
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}
