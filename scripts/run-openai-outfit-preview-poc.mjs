import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const manifestPath = path.join(projectRoot, "src", "data", "openaiOutfitPreviewManifest.json");
const sourceManifestPath = path.join(projectRoot, "src", "data", "resolvedPostImageManifest.json");
const outputDir = path.join(projectRoot, "public", "openai-outfit-preview-poc");

const dryRun = process.argv.includes("--dry-run");
const apiKey = process.env.OPENAI_API_KEY || "";
const model = process.env.OPENAI_OUTFIT_PREVIEW_MODEL || "gpt-5";
const size = process.env.OPENAI_OUTFIT_PREVIEW_SIZE || "1024x1536";
const quality = process.env.OPENAI_OUTFIT_PREVIEW_QUALITY || "low";
const background = process.env.OPENAI_OUTFIT_PREVIEW_BACKGROUND || "auto";

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function fetchAsDataUrl(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "camel-ai-study-openai-outfit-preview-poc/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch reference image: ${url} (${response.status} ${response.statusText})`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
}

async function resolveReferenceImages(sourceEntries) {
  const fetchedImages = await Promise.all(
    sourceEntries.map(async (entry) => {
      try {
        return {
          key: entry.key,
          url: entry.record.thumbnail_url,
          image_url: await fetchAsDataUrl(entry.record.thumbnail_url),
          error: null,
        };
      } catch (error) {
        return {
          key: entry.key,
          url: entry.record.thumbnail_url,
          image_url: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  return {
    usable: fetchedImages.filter((entry) => entry.image_url),
    failed: fetchedImages.filter((entry) => entry.error),
  };
}

function buildPrompt(post) {
  return [
    "Create one realistic outfit preview image for a Korean mobile-first fashion community post.",
    "This is a styling preview, not an exact virtual try-on and not official product photography.",
    `Scene context: ${post.scene_context}.`,
    `Style concern: ${post.style_concern}.`,
    `Intended tone: ${post.intended_tone}.`,
    "Keep the image believable for a real Korean everyday social-fashion upload.",
    "Prefer half-body or full-body vertical mobile framing with a candid mirror selfie, hallway check, elevator mirror, apartment entryway, office mirror, or plain daily-life backdrop.",
    "If the scene is outdoors, keep it to an ordinary Seoul sidewalk or office-adjacent corner without scenic or campaign styling.",
    "Prefer a phone-covered face, partially cropped face, or lightly obscured identity over a polished face-forward beauty shot.",
    "Use ordinary indoor or overcast daylight and visible everyday imperfections such as slight grain, faint mirror smudges, or natural garment wrinkles.",
    "Make the outfit feel like weekday office, commute, lunch-plan, or after-work styling rather than an editorial campaign.",
    "Show the exact debate point clearly in frame so the viewer can judge proportion, fit, balance, or awkwardness from the image itself.",
    "Use the reference product images only as guidance for silhouette, category, and color family.",
    "Treat product references as secondary guidance only, not as the main subject of the image.",
    "Do not add any text overlay, collage layout, luxury-campaign polish, dramatic pose, cinematic angle, or catalog symmetry.",
    "Do not imply exact brand-official proof, real ownership history, durability proof, or exact garment transfer.",
  ].join(" ");
}

async function generatePreview(post, sourceManifest) {
  const sourceEntries = post.source_keys
    .map((key) => ({ key, record: sourceManifest.sources[key] }))
    .filter((entry) => entry.record?.thumbnail_url)
    .slice(0, 3);

  const prompt = buildPrompt(post);

  if (dryRun || !apiKey) {
    return {
      prompt,
      reference_images: sourceEntries.map((entry) => entry.record.thumbnail_url),
      review_status: dryRun ? "dry_run_ready" : "blocked_missing_openai_api_key",
      review_notes: dryRun
        ? "Dry run completed. Prompt and references are assembled, but no generation call was made."
        : "OPENAI_API_KEY is not configured in this workspace, so the generation run could not start.",
      ui_attachment: {
        approved: false,
        label: post.ui_attachment.label,
        assetPath: null,
      },
      generation: null,
    };
  }

  const resolvedReferences = await resolveReferenceImages(sourceEntries);

  if (!resolvedReferences.usable.length) {
    return {
      prompt,
      reference_images: sourceEntries.map((entry) => entry.record.thumbnail_url),
      reference_fetch_failures: resolvedReferences.failed.map(({ key, url, error }) => ({
        key,
        url,
        error,
      })),
      review_status: "blocked_reference_image_fetch_failed",
      review_notes:
        "All reference image fetches failed for this post, so the generation request was skipped pending data-source repair.",
      ui_attachment: {
        approved: false,
        label: post.ui_attachment.label,
        assetPath: null,
      },
      generation: null,
    };
  }

  const payload = {
    model,
    tool_choice: { type: "image_generation" },
    tools: [
      {
        type: "image_generation",
        size,
        quality,
        background,
      },
    ],
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          ...resolvedReferences.usable.map(({ image_url }) => ({ type: "input_image", image_url })),
        ],
      },
    ],
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    const message = result?.error?.message || `OpenAI request failed (${response.status})`;
    throw new Error(message);
  }

  const imageOutput = result.output?.find((entry) => entry.type === "image_generation_call");

  if (!imageOutput?.result) {
    throw new Error(`No image_generation_call result returned for ${post.post_id}`);
  }

  await mkdir(outputDir, { recursive: true });

  const fileName = `${slugify(post.post_id)}-outfit-preview.png`;
  const filePath = path.join(outputDir, fileName);
  await writeFile(filePath, Buffer.from(imageOutput.result, "base64"));

  return {
    prompt,
    reference_images: sourceEntries.map((entry) => entry.record.thumbnail_url),
    reference_fetch_failures: resolvedReferences.failed.map(({ key, url, error }) => ({
      key,
      url,
      error,
    })),
    review_status: "generated_pending_manual_review",
    review_notes: resolvedReferences.failed.length
      ? "Generation completed with partial reference coverage. Manual realism/context/product-association review is still required before UI approval."
      : "Generation completed. Manual realism/context/product-association review is still required before UI approval.",
    ui_attachment: {
      approved: false,
      label: post.ui_attachment.label,
      assetPath: `openai-outfit-preview-poc/${fileName}`,
    },
    generation: {
      response_id: result.id,
      revised_prompt: imageOutput.revised_prompt || null,
      output_path: `public/openai-outfit-preview-poc/${fileName}`,
      model,
      size,
      quality,
      background,
    },
  };
}

async function main() {
  const manifest = await readJson(manifestPath);
  const sourceManifest = await readJson(sourceManifestPath);

  const updatedPosts = [];
  const runStartedAt = new Date().toISOString();

  for (const post of manifest.posts) {
    const generated = await generatePreview(post, sourceManifest);
    updatedPosts.push({
      ...post,
      ...generated,
    });
    const interimManifest = {
      ...manifest,
      poc: {
        ...manifest.poc,
        mainline_model: model,
        default_output: {
          size,
          quality,
          background,
        },
        run_status: dryRun
          ? "dry_run_ready"
          : apiKey
            ? "generated_pending_manual_review"
            : "blocked_missing_openai_api_key",
        recommendation: apiKey ? "refine_after_manual_review" : "refine_after_credentialed_run",
        last_run_at: runStartedAt,
      },
      posts: updatedPosts.concat(manifest.posts.slice(updatedPosts.length)),
    };
    await writeFile(manifestPath, `${JSON.stringify(interimManifest, null, 2)}\n`);
    console.log(`${post.post_id}: ${generated.review_status}`);
  }

  const updatedManifest = {
    ...manifest,
    poc: {
      ...manifest.poc,
      mainline_model: model,
      default_output: {
        size,
        quality,
        background,
      },
      run_status: dryRun
        ? "dry_run_ready"
        : apiKey
          ? "generated_pending_manual_review"
          : "blocked_missing_openai_api_key",
      recommendation: apiKey ? "refine_after_manual_review" : "refine_after_credentialed_run",
      last_run_at: runStartedAt,
    },
    posts: updatedPosts,
  };

  await writeFile(manifestPath, `${JSON.stringify(updatedManifest, null, 2)}\n`);
  console.log(`Wrote manifest -> ${path.relative(projectRoot, manifestPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
