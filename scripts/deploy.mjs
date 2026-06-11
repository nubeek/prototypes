#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const SOURCE_DIR = path.join(REPO_ROOT, "_prototypes");
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, "_out");
const PUBLIC_PATH_REWRITES = new Map([
  ["../../scripts/", "../scripts/"],
  ["../../styles/", "../styles/"],
  ["../../assets/", "../assets/"],
  ["../../.env.local", "../.env.local"],
]);
const LOCAL_REDIRECT_SCRIPT_PATTERN = /\n?  <script data-local-prototypes-redirect>[\s\S]*?<\/script>\n?/;

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--out");
const outputDir = outputIndex === -1
  ? DEFAULT_OUTPUT_DIR
  : path.resolve(REPO_ROOT, args[outputIndex + 1] || "");

const shouldSkip = (source) => {
  const basename = path.basename(source);

  return basename === ".DS_Store"
    || basename === ".cursor"
    || basename === ".git"
    || basename === "_out"
    || source === path.join(REPO_ROOT, "scripts", "deploy.mjs");
};

const copyDirectory = (source, destination) => cp(source, destination, {
  recursive: true,
  force: true,
  filter: (item) => !shouldSkip(item),
});

const listPrototypeNames = async () => {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
};

const walkFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (shouldSkip(entryPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...await walkFiles(entryPath));
      continue;
    }

    files.push(entryPath);
  }

  return files;
};

const rewritePublicPaths = async (directory) => {
  const files = await walkFiles(directory);

  for (const file of files) {
    if (path.extname(file) !== ".html") {
      continue;
    }

    let html = await readFile(file, "utf8");
    const originalHtml = html;

    for (const [sourcePath, publicPath] of PUBLIC_PATH_REWRITES) {
      html = html.split(sourcePath).join(publicPath);
    }

    if (html !== originalHtml) {
      await writeFile(file, html);
    }
  }
};

const copySiteShell = async () => {
  await mkdir(outputDir, { recursive: true });
  const indexSource = await readFile(path.join(REPO_ROOT, "index.html"), "utf8");
  const publicIndex = indexSource.replace(LOCAL_REDIRECT_SCRIPT_PATTERN, "\n");

  await writeFile(path.join(outputDir, "index.html"), publicIndex);
  await copyDirectory(path.join(REPO_ROOT, "assets"), path.join(outputDir, "assets"));
  await copyDirectory(path.join(REPO_ROOT, "styles"), path.join(outputDir, "styles"));
  await copyDirectory(path.join(REPO_ROOT, "scripts"), path.join(outputDir, "scripts"));
  await writeFile(path.join(outputDir, ".nojekyll"), "");
};

const publish = async () => {
  const prototypeNames = await listPrototypeNames();

  if (!prototypeNames.length) {
    throw new Error(`No prototype folders found in ${SOURCE_DIR}`);
  }

  if (outputDir !== REPO_ROOT) {
    await rm(outputDir, { recursive: true, force: true });
    await copySiteShell();
  }

  for (const prototypeName of prototypeNames) {
    const source = path.join(SOURCE_DIR, prototypeName);
    const destination = path.join(outputDir, prototypeName);

    await rm(destination, { recursive: true, force: true });
    await copyDirectory(source, destination);
    await rewritePublicPaths(destination);
  }

  const relativeOutput = path.relative(REPO_ROOT, outputDir) || ".";
  console.log(`Published ${prototypeNames.length} prototypes to ${relativeOutput}`);
};

try {
  await stat(SOURCE_DIR);
  await publish();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
