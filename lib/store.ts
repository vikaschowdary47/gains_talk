import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { DB } from "./types";
import { clearSampleData, seedDB } from "./seed";
import { setTimeZone } from "./util";

/**
 * Data store with three backends, picked automatically:
 *
 * 1. Redis (Upstash REST API) when KV_REST_API_URL + KV_REST_API_TOKEN
 *    (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) are set.
 *    This is what you want on Vercel: data survives deploys and is shared by
 *    every server instance, so WhatsApp webhooks and the coach's screens agree.
 * 2. A temporary folder on Vercel when no Redis is connected. The app works,
 *    but data resets whenever Vercel starts a fresh server.
 * 3. A JSON file in ./data when running locally.
 *
 * The whole database is one JSON document, which is plenty for an MVP.
 */

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const PREFIX = process.env.STORE_PREFIX || "gainstalk";
const DB_KEY = `${PREFIX}:db`;
const MAX_REDIS_UPLOAD = 700 * 1024; // keep each Redis request well under Upstash's 1 MB limit

export type StorageMode = "redis" | "temporary" | "local";

export function storageMode(): StorageMode {
  if (REDIS_URL && REDIS_TOKEN) return "redis";
  if (process.env.VERCEL) return "temporary";
  return "local";
}

const DATA_DIR =
  storageMode() === "temporary"
    ? "/tmp/gainstalk"
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.DATA_DIR || "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

/* ---------- Redis over HTTPS (no extra dependency) ---------- */

async function redis<T = unknown>(command: (string | number)[]): Promise<T> {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!res.ok || body.error) throw new Error(`Redis ${command[0]} failed: ${body.error ?? res.status}`);
  return body.result as T;
}

/* ---------- Files ---------- */

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* ---------- Database ---------- */

export async function readDB(): Promise<DB> {
  const db = await loadDB();
  if (clearSampleData(db)) await writeDB(db);
  setTimeZone(db.settings.timeZone);
  return db;
}

async function loadDB(): Promise<DB> {
  if (storageMode() === "redis") {
    const raw = await redis<string | null>(["GET", DB_KEY]);
    if (raw) return JSON.parse(raw) as DB;
    const db = seedDB();
    await writeDB(db);
    return db;
  }
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) {
    const db = seedDB();
    await writeDB(db);
    return db;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
}

export async function writeDB(db: DB): Promise<void> {
  if (storageMode() === "redis") {
    await redis(["SET", DB_KEY, JSON.stringify(db)]);
    return;
  }
  ensureDirs();
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

/** Read, change, save. Returns whatever the updater returns. */
export async function updateDB<T>(fn: (db: DB) => T): Promise<T> {
  const db = await readDB();
  const out = fn(db);
  await writeDB(db);
  return out;
}

export async function resetDB(): Promise<DB> {
  const db = seedDB();
  await writeDB(db);
  return db;
}

/* ---------- Uploads (voice notes, screenshots) ---------- */

export async function saveUpload(name: string, data: Buffer): Promise<void> {
  if (storageMode() === "redis" && data.length <= MAX_REDIS_UPLOAD) {
    await redis(["SET", `${PREFIX}:upload:${name}`, data.toString("base64")]);
    return;
  }
  ensureDirs();
  fs.writeFileSync(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), data);
}

export async function readUpload(name: string): Promise<Buffer | null> {
  if (storageMode() === "redis") {
    const b64 = await redis<string | null>(["GET", `${PREFIX}:upload:${name}`]);
    if (b64) return Buffer.from(b64, "base64");
  }
  const file = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}
