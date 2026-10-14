#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const SOURCE_DIR = path.join(REPO_ROOT, "_prototypes");
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, "_out");
const PUBLIC_PATH_REWRITES = new Map([
  ["../../../scripts/", "../../scripts/"],
  ["../../../assets/", "../../assets/"],
  ["../../scripts/", "../scripts/"],
  ["../../styles/", "../styles/"],
  ["../../assets/", "../assets/"],
]);
const PUBLIC_ROOT_DIRS = new Set(["scripts", "assets", "styles"]);
const RELATIVE_CLIMB_PATTERN = /(?:\.\.\/)+[A-Za-z0-9._~!$&*+,;=:@%/-]*/g;
const LOCAL_REDIRECT_SCRIPT_PATTERN = /\n?  <script data-local-prototypes-redirect>[\s\S]*?<\/script>\n?/;
const LOCAL_SHARED_PATH = "../_prototypes/shared/";
const PUBLIC_SHARED_PATH = "../shared/";

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

const replaceLiteralPublicPaths = (source) => {
  const sortedRewrites = [...PUBLIC_PATH_REWRITES.entries()]
    .sort((a, b) => b[0].length - a[0].length);
  const placeholders = new Map();
  let next = source;

  for (const [sourcePath] of sortedRewrites) {
    const placeholder = `__PUBLIC_PATH_${placeholders.size}__`;
    placeholders.set(placeholder, sourcePath);
    next = next.split(sourcePath).join(placeholder);
  }

  for (const [sourcePath, publicPath] of sortedRewrites) {
    for (const [placeholder, originalPath] of placeholders) {
      if (originalPath === sourcePath) {
        next = next.split(placeholder).join(publicPath);
      }
    }
  }

  return next;
};

// HTML and CSS urls resolve from the file. Only shorten a climb when it
// actually lands on repo-root scripts/assets/styles. A literal replace also
// matches docs-internal paths such as ../../../scripts/sidebar.js.
const rewriteResolvedPublicPaths = (source, fromDir) => source.replace(RELATIVE_CLIMB_PATTERN, (relativePath) => {
  const absolute = path.resolve(fromDir, relativePath);
  const repoRelative = path.relative(REPO_ROOT, absolute);

  if (repoRelative.startsWith("..") || path.isAbsolute(repoRelative)) {
    return relativePath;
  }

  const [top] = repoRelative.split(path.sep);
  if (!PUBLIC_ROOT_DIRS.has(top)) {
    return relativePath;
  }

  return relativePath.slice("../".length);
});

const rewritePublicPaths = async (directory, sourceDirectory) => {
  const files = await walkFiles(directory);
  const rewritableExtensions = new Set([".html", ".js", ".json", ".css"]);

  for (const file of files) {
    const basename = path.basename(file);
    const extension = path.extname(file);
    if (
      !rewritableExtensions.has(extension)
      || basename.startsWith("generate-")
      || basename.startsWith("patch-")
    ) {
      continue;
    }

    const original = await readFile(file, "utf8");
    const sourceFile = path.join(sourceDirectory, path.relative(directory, file));
    const rewritten = extension === ".html" || extension === ".css"
      ? rewriteResolvedPublicPaths(original, path.dirname(sourceFile))
      : replaceLiteralPublicPaths(original);

    if (rewritten !== original) {
      await writeFile(file, rewritten);
    }
  }
};

const rewriteLocalSharedPaths = async (directory) => {
  const files = await walkFiles(directory);
  const rewritableExtensions = new Set([".html", ".js", ".css"]);

  for (const file of files) {
    if (!rewritableExtensions.has(path.extname(file))) {
      continue;
    }

    const source = await readFile(file, "utf8");
    if (!source.includes(LOCAL_SHARED_PATH)) {
      continue;
    }

    await writeFile(file, source.split(LOCAL_SHARED_PATH).join(PUBLIC_SHARED_PATH));
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
  await copyDirectory(path.join(REPO_ROOT, "logos"), path.join(outputDir, "logos"));
  await rewriteLocalSharedPaths(path.join(outputDir, "styles"));
  await rewriteLocalSharedPaths(path.join(outputDir, "logos"));
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
    await rewritePublicPaths(destination, source);
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
