import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { DB } from "./types";
import { seedDB } from "./seed";

/**
 * Tiny JSON file store. Good for local use and a single small server.
 * Swap this module for Supabase/Postgres before deploying to serverless hosts,
 * where the file system is not persistent.
 */
const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DATA_DIR || "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function readDB(): DB {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) {
    const db = seedDB();
    writeDB(db);
    return db;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
}

export function writeDB(db: DB) {
  ensureDirs();
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

/** Read, change, save. Returns whatever the updater returns. */
export function updateDB<T>(fn: (db: DB) => T): T {
  const db = readDB();
  const out = fn(db);
  writeDB(db);
  return out;
}

export function resetDB(): DB {
  const db = seedDB();
  writeDB(db);
  return db;
}
