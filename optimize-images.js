import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const IN_DIR = process.env.IN_DIR || "./images/imagentes_convert";
const OUT_DIR = process.env.OUT_DIR || "./out_images_v1";
const SIZES = (process.env.SIZES || "480,1024,1920")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);
const WEBP_QUALITY = Number(process.env.WEBP_QUALITY || 74);
const VERSION = process.env.VERSION || "v1";

await fs.mkdir(OUT_DIR, { recursive: true });

const files = (await fs.readdir(IN_DIR)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

if (files.length === 0) {
  console.log("No hay imagenes en", IN_DIR);
  process.exit(0);
}

for (const fileName of files) {
  const inPath = path.join(IN_DIR, fileName);
  const base = fileName.replace(/\.(jpe?g|png|webp)$/i, "");

  const meta = await sharp(inPath).metadata();
  const sourceWidth = Number(meta.width || 0);

  for (const width of SIZES) {
    const targetW = sourceWidth > 0 && sourceWidth < width ? sourceWidth : width;
    const outName = `${base}.${VERSION}.${width}.webp`;
    const outPath = path.join(OUT_DIR, outName);

    await sharp(inPath)
      .resize({ width: targetW, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(outPath);

    console.log("OK", outName);
  }
}

console.log("\nDONE. Variantes en:", OUT_DIR);
