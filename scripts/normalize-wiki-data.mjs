import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stripWikiMarkup(text) {
  return text
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\{\{slink\|([^|}]+)(?:\|[^}]*)?\}\}/g, "$1")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceGroupFromHeading(heading) {
  const normalized = heading.trim().toLowerCase();
  const map = {
    "base game": "base",
    "legacy of the moonspell": "moonspell",
    "tides of the foscari": "foscari",
    "emergency meeting": "emergency_meeting",
    "operation guns": "operation_guns",
    "ode to castlevania": "ode_to_castlevania",
    "emerald diorama": "emerald_diorama",
    "ante chamber": "ante_chamber",
    extra: "extra"
  };
  return map[normalized] ?? null;
}

function splitRows(tableText) {
  return tableText
    .split(/\n\|-\s*\n/g)
    .map((row) => row.trim())
    .filter((row) => row.startsWith("|"));
}

function parseCells(rowText) {
  const lines = rowText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !line.startsWith("|+") && line !== "|}");

  const cells = [];
  let current = null;

  for (const line of lines) {
    if (line === "|") {
      if (current !== null) {
        cells.push(current.trim());
      }
      current = "";
      continue;
    }

    if (line.startsWith("|")) {
      if (current !== null) {
        cells.push(current.trim());
      }
      current = line.slice(1).trim();
      continue;
    }

    if (line.startsWith("*")) {
      current = `${current ?? ""} ${line}`.trim();
    }
  }

  if (current !== null) {
    cells.push(current.trim());
  }

  return cells;
}

function extractAchievements(wikitext) {
  const sections = [];
  const sectionRegex = /^==([^=]+)==\n([\s\S]*?)(?=^==[^=]+==|(?![\s\S]))/gm;
  let sectionMatch;

  while ((sectionMatch = sectionRegex.exec(wikitext)) !== null) {
    const heading = sectionMatch[1].trim();
    const body = sectionMatch[2];
    const sourceGroup = sourceGroupFromHeading(heading);
    if (!sourceGroup) continue;

    const tableStart = body.indexOf("{|class=\"wikitable");
    if (tableStart === -1) continue;
    const tableBody = body.slice(tableStart);
    const tableEnd = tableBody.indexOf("|}");
    if (tableEnd === -1) continue;

    const tableText = tableBody.slice(0, tableEnd + 2);
    const rows = splitRows(tableText);

    const entries = [];
    for (const row of rows) {
      const cells = parseCells(row);
      if (cells.length < 4) continue;

      const achievementRaw = stripWikiMarkup(cells[1] ?? "");
      const descriptionRaw = stripWikiMarkup(cells[2] ?? "");
      const unlocksRaw = stripWikiMarkup(cells[3] ?? "");
      const notesRaw = stripWikiMarkup(cells[4] ?? "");

      if (!achievementRaw || achievementRaw.toLowerCase() === "achievement") continue;

      entries.push({
        id: `${sourceGroup}-${slugify(achievementRaw)}`,
        title: achievementRaw,
        description: descriptionRaw,
        unlocks: unlocksRaw,
        notes: notesRaw,
        sourceGroup,
        unlockCategory: "standard"
      });
    }

    sections.push(...entries);
  }

  return sections;
}

function extractSecrets(wikitext) {
  const results = [];
  const subsectionRegex = /^===([^=]+)===\n([\s\S]*?)(?=^===|^==|(?![\s\S]))/gm;
  let subsectionMatch;

  while ((subsectionMatch = subsectionRegex.exec(wikitext)) !== null) {
    const heading = subsectionMatch[1].trim();
    const body = subsectionMatch[2];
    const sourceGroup = sourceGroupFromHeading(heading) ?? (heading.toLowerCase() === "base game" ? "base" : null);
    if (!sourceGroup) continue;

    const tableStart = body.indexOf("{| class=\"wikitable");
    if (tableStart === -1) continue;
    const tableBody = body.slice(tableStart);
    const tableEnd = tableBody.indexOf("|}");
    if (tableEnd === -1) continue;

    const tableText = tableBody.slice(0, tableEnd + 2);
    const rows = splitRows(tableText);

    for (const row of rows) {
      const cells = parseCells(row);
      if (cells.length < 3) continue;

      const codeName = stripWikiMarkup(cells[0] ?? "");
      const description = stripWikiMarkup(cells[1] ?? "");
      const unlocksText = stripWikiMarkup(cells[2] ?? "").replace(/^\*\s*/g, "");

      if (!codeName || codeName.toLowerCase().startsWith("code name")) continue;

      results.push({
        id: `${sourceGroup}-secret-${slugify(codeName)}`,
        codeName,
        description,
        unlocks: unlocksText,
        sourceGroup,
        unlockCategory: "secret"
      });
    }
  }

  return results;
}

async function main() {
  const rawDir = resolve(process.cwd(), "data/raw/wiki");
  const importDir = resolve(process.cwd(), "data/import");
  await mkdir(importDir, { recursive: true });

  const [achievementsRaw, secretsRaw] = await Promise.all([
    readFile(resolve(rawDir, "achievements.wikitext"), "utf8"),
    readFile(resolve(rawDir, "secrets.wikitext"), "utf8")
  ]);

  const achievementsText = achievementsRaw.replace(/\r\n/g, "\n");
  const secretsText = secretsRaw.replace(/\r\n/g, "\n");

  const achievements = extractAchievements(achievementsText);
  const secrets = extractSecrets(secretsText);

  const output = {
    source: "vampire.survivors.wiki",
    normalizedAt: new Date().toISOString(),
    counts: {
      achievements: achievements.length,
      secrets: secrets.length
    },
    achievements,
    secrets
  };

  const outputPath = resolve(importDir, "wiki.normalized.json");
  await writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`Wrote normalized data -> ${outputPath}`);
  console.log(`Achievements: ${achievements.length}, Secrets: ${secrets.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
