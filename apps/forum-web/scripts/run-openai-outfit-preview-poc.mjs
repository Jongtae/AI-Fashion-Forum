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
const requestedPostIds = process.argv
  .filter((arg) => arg.startsWith("--post-id="))
  .map((arg) => arg.slice("--post-id=".length).trim().toUpperCase())
  .filter(Boolean);
const apiKey = process.env.OPENAI_API_KEY || "";
const model = process.env.OPENAI_OUTFIT_PREVIEW_MODEL || "gpt-5";
const size = process.env.OPENAI_OUTFIT_PREVIEW_SIZE || "1024x1536";
const quality = process.env.OPENAI_OUTFIT_PREVIEW_QUALITY || "low";
const background = process.env.OPENAI_OUTFIT_PREVIEW_BACKGROUND || "auto";

const PRIVACY_TREATMENT_BY_POST = {
  T01: "phone-covered face with a dark navy or graphite phone, not pure black, while keeping the lower half fully readable",
  T02: "partial crop above the nose so identity is hidden by framing rather than a phone-first pose",
  T03: "mirror-frame cutoff that trims most of the forehead and one side of the face without making privacy treatment look staged",
  T04: "phone held naturally but slightly off-center so the face is only partially covered and the silhouette still reads as everyday UGC",
  T05: "soft facial blur with the phone lowered enough that the privacy treatment feels incidental rather than templated",
  T06: "angle-based concealment from a casual side turn instead of a direct face-cover pose",
  T07: "tight mirror crop from chin to upper torso so the face is mostly out of frame without becoming a beauty crop",
  T11: "fitting-room mirror framing with the top of the head and most of the face cut off naturally by the mirror crop",
  T13: "phone-covered face with a light or metallic phone and stronger emphasis on the lower-body fit zone",
  T14: "partial head cutoff at the top of the mirror frame so shirt volume stays primary and identity stays hidden",
  T15: "crop the frame from neck down so trouser comparison stays primary and identity is hidden by composition",
  T16: "three-quarter mirror angle with hair and phone obscuring enough of the face to protect identity without repeating the same straight-on phone pose",
};

const SCENE_VARIATION_BY_POST = {
  T01: {
    location: "a compact office elevator with brushed steel walls and cool weekday building light",
    lighting: "flat overhead fluorescent light with a slightly grey morning cast",
    framing: "full-body vertical mirror selfie with the lower half fully readable",
    pose: "standing square but relaxed, one foot slightly forward as if checking proportions before work",
  },
  T02: {
    location: "a plain sidewalk corner outside a small office building, with neutral concrete and no scenic backdrop",
    lighting: "soft overcast daylight with low contrast",
    framing: "three-quarter or full-body mobile frame that prioritizes silhouette over face detail",
    pose: "brief pause mid-commute rather than a posed fashion stance",
  },
  T03: {
    location: "a cramped apartment entryway with a shoe rack, umbrella, and door-side mirror",
    lighting: "weak warm household light mixed with a little cool daylight from the entrance",
    framing: "slightly cropped vertical mirror shot that cuts the face naturally and keeps the outfit readable",
    pose: "caught mid-departure, shifting weight or adjusting a bag rather than standing still",
  },
  T04: {
    location: "an office hallway mirror or lobby mirror with neutral walls and ordinary building finishes",
    lighting: "mixed indoor daylight and ceiling light without dramatic contrast",
    framing: "full-body mirror image with enough space to judge upper-body volume and trouser line",
    pose: "natural front-facing check with one arm relaxed and no catalog symmetry",
  },
  T05: {
    location: "a narrow apartment hall or entry mirror with visible lived-in clutter kept minimal",
    lighting: "soft indoor household light that feels slightly dimmer than office lighting",
    framing: "full-body mirror selfie that clearly shows shoes, socks, and skirt balance",
    pose: "casual pre-exit check with the bag hanging naturally and feet set in an everyday stance",
  },
  T06: {
    location: "a lunch-break mirror or glass reflection near an office cafe entrance",
    lighting: "mild midday natural light with no cinematic grading",
    framing: "full-body candid frame that reads like a quick style check",
    pose: "subtle side turn or walking pause instead of a posed front-on stance",
  },
  T07: {
    location: "a small elevator or restroom mirror before an evening appointment",
    lighting: "warm indoor evening light with slight phone-camera noise",
    framing: "tight upper-body mirror crop that keeps jacket and inner balance primary",
    pose: "one hand lightly adjusting the jacket or bag as if checking the look before heading out",
  },
  T11: {
    location: "a fitting-room mirror with curtain edge, bench, or shopping bag visible",
    lighting: "neutral store lighting that feels flat and practical",
    framing: "head-cut or upper-face-cut mirror frame that keeps the blazer shape primary",
    pose: "quiet fitting-room stance rather than a polished social pose",
  },
  T13: {
    location: "a fitting-room or elevator mirror dedicated to lower-body fit checking",
    lighting: "plain overhead light without shadows that hide the trouser line",
    framing: "lower-body-priority composition that makes hip, thigh, and hem easy to inspect",
    pose: "small weight shift that reveals the pants shape instead of a fashion pose",
  },
  T14: {
    location: "a home wardrobe mirror by a window or bright room corner",
    lighting: "soft natural daylight with a little household shadow falloff",
    framing: "half-to-full body mirror shot with a slight top crop to keep attention on shirt volume",
    pose: "easy at-home stance, one shoulder slightly dropped so the shirt volume reads honestly",
  },
  T15: {
    location: "a plain mirror setup intended for comparing trouser silhouettes, not a styled editorial scene",
    lighting: "simple indoor light that keeps leg line and hem visible",
    framing: "full lower-body frame focused on silhouette difference rather than facial detail",
    pose: "balanced comparison stance with minimal styling drama",
  },
  T16: {
    location: "a building elevator or lobby mirror during a cold commute, with just enough space for coat comparison context",
    lighting: "cool indoor building light with a muted morning tone",
    framing: "three-quarter or full-body mirror frame that keeps coat size and shoulder volume legible",
    pose: "slight angle with coat held or draped naturally, like a real sizing decision moment",
  },
  T06: {
    location: "an office cafe entrance mirror or glass reflection right before stepping out for lunch",
    lighting: "soft midday daylight mixed with neutral indoor office light",
    framing: "full-body quick check that still keeps denim and shoes easy to read",
    pose: "slight walking pause with one shoulder turned, like a casual lunch-plan snapshot",
  },
  T09: {
    location: "a rainy weekday office lobby or building entrance with damp floor reflection and no scenic styling",
    lighting: "cool cloudy daylight mixed with dim lobby light",
    framing: "full-body mobile photo that keeps trouser line and everyday bag visible",
    pose: "practical pre-commute stance, one hand holding a tote or umbrella rather than a fashion pose",
  },
  T10: {
    location: "a small apartment entryway with the front door, shoe shelf, and leash visible",
    lighting: "ordinary morning household light with soft daylight leaking from the doorway",
    framing: "full-body or three-quarter entryway photo where both the bag and the dog interruption are readable",
    pose: "caught mid-exit while the dog blocks the path rather than a posed mirror check",
  },
  T12: {
    location: "a bedroom or dressing corner with a mirror, bed edge, or laid-out clothes visible",
    lighting: "soft weekend daylight through curtains with mild indoor shadow",
    framing: "three-quarter candid frame that keeps the dress candidate readable while the cat occupies part of the scene",
    pose: "bending slightly or pausing while preparing to take a mirror photo, interrupted by the cat",
  },
  T17: {
    location: "a lived-in sofa-side or bedroom floor corner at home with a knit laid down briefly",
    lighting: "soft home light with slightly muted afternoon daylight",
    framing: "closer lifestyle frame that shows the knit texture and the cat taking over the shot",
    pose: "incidental home snapshot rather than a person-centered fashion pose",
  },
  T18: {
    location: "an apartment doorway or hallway right before leaving for work with dog-walk items nearby",
    lighting: "plain indoor morning light with a little cool daylight from the door",
    framing: "lower or mid-height framing that keeps the bag, legs, and excited dog movement visible",
    pose: "caught in a small pre-exit scramble instead of standing still",
  },
  T19: {
    location: "an office restroom or quiet hallway mirror later in the day after outfit adjustment",
    lighting: "even fluorescent indoor light without polish",
    framing: "full-body mirror shot that feels like a quick record after swapping one item",
    pose: "simple stance with a small shoulder drop, like a private note-to-self snapshot",
  },
  T20: {
    location: "a bedroom or hallway mirror during a rushed weekday dressing moment",
    lighting: "soft indoor household light with realistic shadow and slight phone grain",
    framing: "half-to-full body candid mirror frame that keeps the knit and layering context readable",
    pose: "mid-change or brief pause before heading out, not a polished social pose",
  },
};

const POST_SPECIFIC_DIRECTION = {
  T06: "The bottom must read clearly as denim jeans rather than tailored slacks, and the subject should read as an adult Korean woman from a women's lifestyle community post.",
  T09: "Keep the subject as an adult Korean woman commuter, and make the charcoal trouser choice and rainy-day practicality more important than any editorial mood.",
  T10: "Keep the subject as an adult Korean woman leaving home for work, with the dog secondary to the bag-check moment.",
  T18: "Keep the subject as an adult Korean woman in a hurried doorway scene, and make the work bag more central than the dog.",
  T19: "Keep the subject as an adult Korean woman making a quiet mirror note, with the shirt-pairing adjustment and everyday office realism clearly visible.",
  T20: "Keep the subject as an adult Korean woman in a believable rushed dressing moment, with the scratchy knit and layering frustration reading clearly.",
};

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
  const format = post.format || "style_question";
  const privacyTreatment =
    post.privacy_treatment || PRIVACY_TREATMENT_BY_POST[post.post_id] || "phone-obscured or naturally cropped face";
  const sceneVariation = SCENE_VARIATION_BY_POST[post.post_id] || null;
  const roleLine =
    format === "pet_episode"
      ? "This is a supporting lifestyle scene image for a fashion-centered community post, where the pet creates the emotional hook but must not become the only subject."
      : format === "daily_snapshot"
        ? "This is a supporting lifestyle scene image for a fashion-centered community post, focused on a casual daily outfit record rather than a heavy style-decision debate."
        : format === "empathy_post"
          ? "This is a supporting lifestyle scene image for a fashion-centered community post, focused on a relatable dressing moment rather than a polished hero shot."
          : "This is a styling preview, not an exact virtual try-on and not official product photography.";
  const formatRule =
    format === "pet_episode"
      ? "Keep fashion and daily-life context primary, and let the pet enter the frame naturally as part of the situation instead of a hero subject."
      : format === "daily_snapshot"
        ? "Let the image read as a quick lived-in record from a real day, with fashion still legible but no need for a hard judgment-frame pose."
        : format === "empathy_post"
          ? "Let the image feel like a believable clothing-related moment that invites empathy, not a polished campaign or generic mood image."
          : "Show the exact debate point clearly in frame so the viewer can judge proportion, fit, balance, or awkwardness from the image itself.";

  return [
    "Create one realistic outfit preview image for a Korean mobile-first fashion community post.",
    roleLine,
    `Scene context: ${post.scene_context}.`,
    `Style concern: ${post.style_concern}.`,
    `Intended tone: ${post.intended_tone}.`,
    "Keep the image believable for a real Korean everyday social-fashion upload.",
    "Unless the scene is explicitly object-only, portray an adult Korean woman in her 20s or 30s so the result fits the product's women's lifestyle community context.",
    "Prefer half-body or full-body vertical mobile framing with candid Korean everyday UGC, not a repeated studio-like scene recipe.",
    sceneVariation ? `Location treatment: ${sceneVariation.location}.` : "Use an ordinary everyday location rather than a scenic or campaign-like backdrop.",
    sceneVariation ? `Lighting treatment: ${sceneVariation.lighting}.` : "Use ordinary indoor, household, office, or overcast natural light rather than dramatic lighting.",
    sceneVariation ? `Framing treatment: ${sceneVariation.framing}.` : "Use practical mobile framing that keeps the debate point readable without catalog symmetry.",
    sceneVariation ? `Pose treatment: ${sceneVariation.pose}.` : "Keep the pose natural and incidental rather than styled.",
    "If the scene is outdoors, keep it to an ordinary Seoul sidewalk or office-adjacent corner without scenic or campaign styling.",
    `Use this privacy treatment: ${privacyTreatment}.`,
    "Vary privacy treatment, location, lighting, framing, and pose naturally across the set instead of defaulting to the same black-phone face-cover composition or mirror recipe.",
    "Use ordinary indoor or overcast daylight and visible everyday imperfections such as slight grain, faint mirror smudges, or natural garment wrinkles.",
    "Make the outfit feel like weekday office, commute, lunch-plan, or after-work styling rather than an editorial campaign.",
    formatRule,
    "If there is a pet in the scene, it should support the lifestyle moment and never overpower the outfit, clothing context, or everyday situation.",
    POST_SPECIFIC_DIRECTION[post.post_id] || "",
    "Use the reference product images only as guidance for silhouette, category, and color family.",
    "Treat product references as secondary guidance only, not as the main subject of the image.",
    "Do not add any text overlay, collage layout, luxury-campaign polish, dramatic pose, cinematic angle, or catalog symmetry.",
    "Do not imply exact brand-official proof, real ownership history, durability proof, or exact garment transfer.",
  ].join(" ");
}

async function generatePreview(post, sourceManifest) {
  const attachmentKey = post.scene_attachment ? "scene_attachment" : "ui_attachment";
  const attachment = post[attachmentKey] || { label: "착장 미리보기" };
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
      [attachmentKey]: {
        approved: false,
        label: attachment.label,
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
      [attachmentKey]: {
        approved: false,
        label: attachment.label,
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
    [attachmentKey]: {
      approved: false,
      label: attachment.label,
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

  const runStartedAt = new Date().toISOString();
  const requestedSet = new Set(requestedPostIds);
  const targetPosts = requestedSet.size
    ? manifest.posts.filter((post) => requestedSet.has(post.post_id))
    : manifest.posts;

  if (requestedSet.size && targetPosts.length === 0) {
    throw new Error(`No posts matched requested filters: ${requestedPostIds.join(", ")}`);
  }

  const updatedPostMap = new Map(manifest.posts.map((post) => [post.post_id, post]));

  for (const post of targetPosts) {
    const generated = await generatePreview(post, sourceManifest);
    updatedPostMap.set(post.post_id, {
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
      posts: manifest.posts.map((entry) => updatedPostMap.get(entry.post_id) || entry),
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
    posts: manifest.posts.map((entry) => updatedPostMap.get(entry.post_id) || entry),
  };

  await writeFile(manifestPath, `${JSON.stringify(updatedManifest, null, 2)}\n`);
  console.log(`Wrote manifest -> ${path.relative(projectRoot, manifestPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
