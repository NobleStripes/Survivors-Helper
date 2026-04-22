import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const WIKI_BASE_URL = "https://vampire.survivors.wiki/w";
const PAGES = [
  { key: "achievements", title: "Achievements" },
  { key: "secrets", title: "Secrets" },
  { key: "characters", title: "Characters" }
];

async function fetchRawPage(title) {
  const url = `${WIKI_BASE_URL}/${encodeURIComponent(title)}?action=raw`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Survivors-Helper-DataFetch/0.1 (+https://github.com/NobleStripes/Survivors-Helper)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${title}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function inferLastEdited(wikitext) {
  const match = wikitext.match(/This page was last edited on ([^.]+)\./i);
  return match ? match[1].trim() : null;
}

async function main() {
  const outputDir = resolve(process.cwd(), "data/raw/wiki");
  await mkdir(outputDir, { recursive: true });

  const now = new Date().toISOString();
  const manifest = {
    source: "vampire.survivors.wiki",
    fetchedAt: now,
    pages: []
  };

  for (const page of PAGES) {
    const raw = await fetchRawPage(page.title);
    const filePath = resolve(outputDir, `${page.key}.wikitext`);
    await writeFile(filePath, raw, "utf8");

    manifest.pages.push({
      key: page.key,
      title: page.title,
      file: `data/raw/wiki/${page.key}.wikitext`,
      byteLength: Buffer.byteLength(raw, "utf8"),
      inferredLastEdited: inferLastEdited(raw)
    });

    console.log(`Fetched ${page.title} -> ${filePath}`);
  }

  const manifestPath = resolve(outputDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Wrote manifest -> ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
