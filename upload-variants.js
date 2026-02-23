import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const BUCKET = process.env.BUCKET || "PDFWH";
const LOCAL_DIR = process.env.LOCAL_DIR || "./out_images_v1";
const REMOTE_PREFIX = process.env.REMOTE_PREFIX || "images";
const ALLOWED_WIDTHS = new Set(
  (process.env.SIZES || "480,1024,1920")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Faltan SUPABASE_URL y una key (SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY)"
  );
}

function jwtRole(token) {
  try {
    const payload = JSON.parse(
      Buffer.from(String(token || "").split(".")[1] || "", "base64url").toString("utf8")
    );
    return payload?.role || "";
  } catch {
    return "";
  }
}

if (SUPABASE_SERVICE_ROLE_KEY && jwtRole(SUPABASE_SERVICE_ROLE_KEY) !== "service_role") {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY no es una service_role valida (parece anon). Revisa .env."
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "Aviso: usando SUPABASE_ANON_KEY. La subida puede fallar por politicas de bucket."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const files = (await fs.readdir(LOCAL_DIR)).filter((f) => {
  if (!f.toLowerCase().endsWith(".webp")) return false;
  const m = f.match(/\.v\d+\.(\d+)\.webp$/i);
  if (!m) return false;
  return ALLOWED_WIDTHS.has(Number(m[1]));
});

if (files.length === 0) {
  console.log("No hay .webp en", LOCAL_DIR);
  process.exit(0);
}

for (const fileName of files) {
  const localPath = path.join(LOCAL_DIR, fileName);
  const remotePath = `${REMOTE_PREFIX}/${fileName}`;
  const bytes = await fs.readFile(localPath);

  const { error } = await supabase.storage.from(BUCKET).upload(remotePath, bytes, {
    upsert: true,
    contentType: "image/webp",
    cacheControl: "31536000",
  });

  if (error) {
    throw new Error(`${remotePath}: ${error.message}`);
  }

  console.log("UPLOADED", remotePath);
}

console.log("\nDONE upload.");
