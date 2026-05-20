/**
 * One-off: remove checkerboard/white backgrounds and trim bobblehead portraits.
 * Run: node scripts/process-bobble-faces.mjs
 */
import sharp from "sharp";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const inputDir = path.join(root, "public/members/faces");
const outputDir = path.join(root, "public/members/bobble-faces-clean");

const members = ["jack", "sergio", "shadi", "sam", "aaron", "nigel"];

const BACKGROUND_MIN = 238;
const BACKGROUND_CHROMA_MAX = 12;
const NEUTRAL_CHECKER_MIN = 240;
const NEUTRAL_CHECKER_CHROMA_MAX = 6;

function isBackgroundLike(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  return max >= BACKGROUND_MIN && max - min <= BACKGROUND_CHROMA_MAX;
}

function isNeutralCheckerPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  return max >= NEUTRAL_CHECKER_MIN && max - min <= NEUTRAL_CHECKER_CHROMA_MAX;
}

function pixelIndex(x, y, width) {
  return y * width + x;
}

async function removeEdgeConnectedBackground(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8ClampedArray(data);
  const { width, height } = info;
  const visited = new Uint8Array(width * height);
  const queue = [];

  function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;

    const idx = pixelIndex(x, y, width);
    if (visited[idx]) return;

    const offset = idx * 4;
    if (!isBackgroundLike(pixels[offset], pixels[offset + 1], pixels[offset + 2])) {
      return;
    }

    visited[idx] = 1;
    queue.push(idx);
  }

  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const idx = queue[head];
    const x = idx % width;
    const y = Math.floor(idx / width);

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let idx = 0; idx < visited.length; idx += 1) {
    const offset = idx * 4;
    if (visited[idx]) {
      pixels[offset + 3] = 0;
    } else if (
      isNeutralCheckerPixel(pixels[offset], pixels[offset + 1], pixels[offset + 2])
    ) {
      pixels[offset + 3] = 0;
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function processMember(id) {
  const inputPath = path.join(inputDir, `${id}.png`);
  const outputPath = path.join(outputDir, `${id}.png`);

  const meta = await sharp(inputPath).metadata();
  const transparent = await removeEdgeConnectedBackground(inputPath);

  const trimmed = await sharp(transparent).trim({ threshold: 1 }).toBuffer();

  await sharp(trimmed)
    .resize({ height: 128, withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(outputPath);

  const outMeta = await sharp(outputPath).metadata();
  const { size } = await import("fs/promises").then((fs) =>
    fs.stat(outputPath),
  );
  console.log(
    `${id}: ${meta.width}x${meta.height} -> ${outMeta.width}x${outMeta.height} (${Math.round(size / 1024)}kb)`,
  );
}

await mkdir(outputDir, { recursive: true });
for (const id of members) {
  await processMember(id);
}
console.log(`Done. Output: ${outputDir}`);
