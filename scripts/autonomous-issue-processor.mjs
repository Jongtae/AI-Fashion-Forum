import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const githubToken = process.env.GITHUB_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-5.1-codex";
const defaultBranch = process.env.DEFAULT_BRANCH || "main";
const dryRun = String(process.env.DRY_RUN || "false").toLowerCase() === "true";
const runId = process.env.GITHUB_RUN_ID || "local";
const repo = process.env.GITHUB_REPOSITORY;
let activeIssue = null;

if (!repo) {
  throw new Error("GITHUB_REPOSITORY is required.");
}

if (!githubToken) {
  throw new Error("GITHUB_TOKEN is required.");
}

if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY is required for autonomous issue processing.");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status ?? 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function runOrThrow(command, args, options = {}) {
  const result = run(command, args, options);
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}\n${result.stderr}`.trim()
    );
  }
  return result.stdout.trim();
}

async function githubApi(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}\n${body}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function listOpenIssues() {
  const [owner, name] = repo.split("/");
  const issues = await githubApi(`/repos/${owner}/${name}/issues?state=open&per_page=100&sort=created&direction=asc`);
  return issues.filter((issue) => !issue.pull_request);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "issue";
}

function issueIsReady(issue) {
  const labels = new Set((issue.labels || []).map((label) => label.name));
  const blockedLabels = ["epic", "blocked", "needs-design", "autofix-skip", "no-autofix"];

  if (blockedLabels.some((label) => labels.has(label))) {
    return false;
  }

  return /completion criteria/i.test(issue.body || "");
}

function extractPathsFromText(text) {
  const matches = new Set();
  const pathPattern = /`([^`]*\.(?:md|mdx|js|mjs|ts|tsx|json|yml|yaml|jsx))`/g;
  let match;

  while ((match = pathPattern.exec(text)) !== null) {
    const path = match[1].replace(/^\.?\//, "");
    if (path && !path.startsWith("http")) {
      matches.add(path);
    }
  }

  return [...matches];
}

function sampleFile(path, maxLines = 200) {
  try {
    const content = readFileSync(path, "utf8");
    const lines = content.split("\n");
    const trimmed = lines.slice(0, maxLines).join("\n");
    return `FILE: ${path}\n${trimmed}\n`;
  } catch {
    return "";
  }
}

function gatherContext(issue) {
  const baselineFiles = [
    "package.json",
    "README.md",
    "WORKFLOW.md",
    "CLAUDE.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/workflows/deploy-pages.yml",
    "docs/governance-workflow/github-issue-workflow.md",
  ];

  const issuePaths = extractPathsFromText(`${issue.title}\n${issue.body || ""}`);
  const candidateFiles = new Set([...baselineFiles, ...issuePaths]);
  const snippets = [];

  for (const file of candidateFiles) {
    const snippet = sampleFile(file, file.endsWith(".json") ? 120 : 220);
    if (snippet) {
      snippets.push(snippet);
    }
  }

  return snippets.join("\n");
}

async function requestPatch(issue, context) {
  const system = [
    "You are an autonomous software engineer working in a GitHub repository.",
    "Your job is to make the smallest safe change that satisfies the issue.",
    "Respect the repository workflow and keep the change reviewable.",
    "Output only a unified diff inside a single fenced ```diff block.",
    "Do not add explanatory prose outside the diff.",
  ].join(" ");

  const user = [
    `Repository: ${repo}`,
    `Default branch: ${defaultBranch}`,
    `Issue #${issue.number}: ${issue.title}`,
    "",
    "Issue body:",
    issue.body || "(empty)",
    "",
    "Relevant repository context:",
    context || "(no extra context found)",
    "",
    "Requirements:",
    "- Make the minimum coherent change.",
    "- Preserve existing conventions.",
    "- If you need to add documentation for the change, keep it concise.",
    "- The diff must apply cleanly with git apply.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: [{ type: "text", text: system }] },
        { role: "user", content: [{ type: "text", text: user }] },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}\n${body}`);
  }

  const data = await response.json();
  const text =
    data.output_text ||
    (data.output || [])
      .flatMap((item) => item.content || [])
      .map((content) => content.text || "")
      .join("\n");

  const diffMatch = text.match(/```diff\s*([\s\S]*?)```/i);
  return {
    raw: text,
    diff: (diffMatch ? diffMatch[1] : text).trim() + "\n",
  };
}

function applyPatch(diff) {
  const patchFile = ".autonomous-issue.patch";
  writeFileSync(patchFile, diff, "utf8");
  runOrThrow("git", ["apply", "--check", patchFile]);
  runOrThrow("git", ["apply", patchFile]);
}

function commitChanges(issue, branchName) {
  runOrThrow("git", ["add", "-A"]);
  const status = run("git", ["status", "--porcelain"]);
  if (!status.stdout.trim()) {
    throw new Error("No file changes were produced by the patch.");
  }

  runOrThrow("git", ["commit", "-m", `chore: process issue #${issue.number}`]);
  if (!dryRun) {
    runOrThrow("git", ["push", "-u", "origin", branchName]);
  }
}

async function commentOnIssue(issueNumber, body) {
  const [owner, name] = repo.split("/");
  await githubApi(`/repos/${owner}/${name}/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

async function createPullRequest(issue, branchName) {
  const title = `chore: ${issue.title}`;
  const body = [
    `Fixes #${issue.number}`,
    "",
    "Autonomous issue processing run.",
    `Run ID: ${runId}`,
    `Branch: ${branchName}`,
  ].join("\n");

  if (dryRun) {
    return { url: "(dry-run)", number: null };
  }

  const output = runOrThrow("gh", [
    "pr",
    "create",
    "--title",
    title,
    "--body",
    body,
    "--base",
    defaultBranch,
    "--head",
    branchName,
  ]);

  const urlMatch = output.match(/https:\/\/github\.com\/[^\s]+/);
  return {
    url: urlMatch ? urlMatch[0] : output,
    number: null,
  };
}

async function tryMergePullRequest(prUrl) {
  if (dryRun) {
    return;
  }

  const merge = run("gh", ["pr", "merge", prUrl, "--squash", "--delete-branch"]);
  if (merge.status !== 0) {
    console.warn(merge.stderr || merge.stdout);
  }
}

async function main() {
  const issues = await listOpenIssues();
  const issue = issues.find(issueIsReady);

  if (!issue) {
    console.log("No ready issues found. Nothing to do.");
    return;
  }

  const branchName = `codex/issue-${issue.number}-${slugify(issue.title)}`;
  activeIssue = issue;
  console.log(`Selected issue #${issue.number}: ${issue.title}`);
  console.log(`Branch: ${branchName}`);

  await commentOnIssue(
    issue.number,
    [
      `Autonomous processing has started on branch \`${branchName}\`.`,
      `Run ID: ${runId}`,
      dryRun ? "This was a dry run." : "The workflow will try to commit, open a PR, and merge if possible.",
    ].join("\n")
  );

  runOrThrow("git", ["fetch", "origin", defaultBranch]);
  runOrThrow("git", ["checkout", "-B", branchName, `origin/${defaultBranch}`]);

  const context = gatherContext(issue);
  const patch = await requestPatch(issue, context);
  applyPatch(patch.diff);

  runOrThrow("npm", ["test", "--workspaces", "--if-present"]);
  runOrThrow("npm", ["run", "build"]);

  commitChanges(issue, branchName);

  const pr = await createPullRequest(issue, branchName);
  await commentOnIssue(
    issue.number,
    [
      `Automation completed a candidate change for this issue.`,
      `PR: ${pr.url}`,
      "The issue will close automatically once the PR merges because the PR body includes `Fixes #...`.",
    ].join("\n")
  );

  await tryMergePullRequest(pr.url);
}

main().catch(async (error) => {
  console.error(error.stack || error.message || String(error));
  if (activeIssue) {
    try {
      await commentOnIssue(
        activeIssue.number,
        [
          `Autonomous processing failed for this run.`,
          `Run ID: ${runId}`,
          `Error: ${error.message || String(error)}`,
        ].join("\n")
      );
    } catch (commentError) {
      console.error(commentError.stack || commentError.message || String(commentError));
    }
  }
  process.exitCode = 1;
});
