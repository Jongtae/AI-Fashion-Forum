import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const inputPath = path.join(projectRoot, "data", "image-crawl-sources.json");
const outputDir = path.join(projectRoot, "public", "crawled-images");
const manifestPath = path.join(projectRoot, "src", "data", "crawledImageManifest.json");

function inferExtension(contentType) {
  if (!contentType) {
    return ".jpg";
  }

  if (contentType.includes("png")) {
    return ".png";
  }

  if (contentType.includes("webp")) {
    return ".webp";
  }

  if (contentType.includes("avif")) {
    return ".avif";
  }

  return ".jpg";
}

async function downloadImage(record) {
  const response = await fetch(record.source_url, {
    headers: {
      "user-agent": "camel-ai-study-image-crawler/1.0",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${record.image_id}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const extension = inferExtension(contentType);
  const fileName = `${record.image_id}${extension}`;
  const filePath = path.join(outputDir, fileName);
  const arrayBuffer = await response.arrayBuffer();

  await writeFile(filePath, Buffer.from(arrayBuffer));

  return {
    ...record,
    content_type: contentType || "image/jpeg",
    file_name: fileName,
    localPath: `public/crawled-images/${fileName}`,
    assetPath: `crawled-images/${fileName}`,
    downloaded_at: new Date().toISOString(),
  };
}

async function main() {
  const sourceFile = await readFile(inputPath, "utf8");
  const sources = JSON.parse(sourceFile);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });

  const manifest = [];

  for (const record of sources) {
    const downloaded = await downloadImage(record);
    manifest.push(downloaded);
    console.log(`Downloaded ${downloaded.image_id} -> ${downloaded.assetPath}`);
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote manifest -> ${path.relative(projectRoot, manifestPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
