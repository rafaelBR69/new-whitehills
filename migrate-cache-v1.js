import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const USING_SERVICE_ROLE = Boolean(SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = process.env.BUCKET || "PDFWH";
const PREFIX = process.env.PREFIX || "images";
const VERSION = process.env.VERSION || "v1";

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

if (USING_SERVICE_ROLE && jwtRole(SUPABASE_SERVICE_ROLE_KEY) !== "service_role") {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY no es una service_role valida (parece anon). Copia la key de Project Settings > API > service_role."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function contentTypeFromPath(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

function versionedPath(path, version = VERSION) {
  // images/foo.webp -> images/foo.v1.webp
  const idx = path.lastIndexOf(".");
  if (idx === -1) return `${path}.${version}`;
  return `${path.slice(0, idx)}.${version}${path.slice(idx)}`;
}

async function listAll(prefix) {
  // Supabase list page by page (limit 1000)
  const out = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;
    if (!data || data.length === 0) break;

    out.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }

  return out;
}

async function listFilesRecursive(prefix) {
  const items = await listAll(prefix);
  const files = [];

  for (const item of items) {
    if (!item?.name) continue;
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

    // In list(): files usually have id; folders usually do not.
    if (item.id) {
      files.push(fullPath);
      continue;
    }

    const nested = await listFilesRecursive(fullPath);
    files.push(...nested);
  }

  return files;
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
}

async function migrateOne(oldPath) {
  const newPath = versionedPath(oldPath, VERSION);
  const contentType = contentTypeFromPath(oldPath);

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(oldPath);

  if (downloadError) throw downloadError;

  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, bytes, {
      upsert: true,
      contentType,
      cacheControl: "31536000",
    });

  if (uploadError) throw uploadError;

  const oldUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${oldPath}`;
  const newUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${newPath}`;

  return { oldPath, newPath, oldUrl, newUrl };
}

async function main() {
  if (!USING_SERVICE_ROLE) {
    console.warn(
      "Aviso: estas usando SUPABASE_ANON_KEY. Para listar/migrar de forma fiable usa SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const allFiles = await listFilesRecursive(PREFIX);
  const files = allFiles.filter((p) => !p.includes(`.${VERSION}.`));

  if (files.length === 0) {
    console.log(
      `Nada que migrar en prefix='${PREFIX}' (ya existen .${VERSION} o no hay permisos de list).`
    );
    if (!USING_SERVICE_ROLE) {
      console.log(
        "Si sabes que hay archivos, anade SUPABASE_SERVICE_ROLE_KEY en .env (list() con anon suele devolver vacio)."
      );
    }
    return;
  }

  console.log(
    `Migrando ${files.length} archivos en prefix='${PREFIX}' -> .${VERSION}...`
  );

  const map = [];
  for (const path of files) {
    process.stdout.write(`- ${path} ... `);
    const row = await migrateOne(path);
    map.push(row);
    console.log("OK");
  }

  await ensureDir("./out");
  await fs.writeFile("./out/url-map.json", JSON.stringify(map, null, 2), "utf8");
  console.log("\nHecho. Mapa en: out/url-map.json");
  console.log("Ahora cambia tu web a las URLs versionadas");
}

main().catch((error) => {
  console.error("ERROR:", error?.message || error);
  process.exit(1);
});
