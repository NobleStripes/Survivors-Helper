import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function inferRewardType(unlocks, category) {
  const text = (unlocks ?? "").toLowerCase();
  if (text.includes("gold") || text.includes("coin")) return "gold";
  if (text.includes("map") || text.includes("mode") || text.includes("list") || text.includes("menu")) return "feature";
  if (text.includes("tower") || text.includes("forest") || text.includes("plant") || text.includes("library") || text.includes("stage")) {
    return "stage";
  }
  if (category === "secret") return "character";
  return "feature";
}

function inferPrerequisite(entry, unlockId) {
  const desc = (entry.description ?? "").toLowerCase();

  if (desc.includes("reach level")) {
    const levelMatch = desc.match(/reach level\s+(\d+)/i);
    const level = levelMatch ? Number(levelMatch[1]) : 1;
    return {
      id: `pre-${unlockId}-level`,
      type: "level",
      subject: "any_character",
      operator: "gte",
      value: level,
      scope: "run",
      sourceUnlockId: unlockId
    };
  }

  if (desc.includes("survive")) {
    const minuteMatch = desc.match(/survive\s+(\d+)\s+minute/i);
    const minutes = minuteMatch ? Number(minuteMatch[1]) : 1;
    return {
      id: `pre-${unlockId}-survive`,
      type: "time_survived",
      subject: "any_stage",
      operator: "gte",
      value: minutes,
      scope: "run",
      sourceUnlockId: unlockId
    };
  }

  if (desc.includes("defeat")) {
    return {
      id: `pre-${unlockId}-defeat`,
      type: "enemy_kills",
      subject: "specific_enemy",
      operator: "gte",
      value: 1,
      scope: "lifetime",
      sourceUnlockId: unlockId
    };
  }

  if (desc.includes("find")) {
    return {
      id: `pre-${unlockId}-find`,
      type: "item_find",
      subject: "target_item",
      operator: "eq",
      value: "found",
      scope: "lifetime",
      sourceUnlockId: unlockId
    };
  }

  if (entry.unlockCategory === "secret") {
    return {
      id: `pre-${unlockId}-secret`,
      type: "secret_hint",
      subject: entry.codeName ?? "secret_code",
      operator: "eq",
      value: "active",
      scope: "lifetime",
      sourceUnlockId: unlockId
    };
  }

  return {
    id: `pre-${unlockId}-unlock`,
    type: "unlock",
    subject: "progression",
    operator: "eq",
    value: "complete",
    scope: "lifetime",
    sourceUnlockId: unlockId
  };
}

function buildUnlockEntry(entry, index) {
  const unlockId = entry.id || `${entry.sourceGroup}-${slugify(entry.title ?? entry.codeName ?? `entry-${index}`)}`;
  const unlocksText = entry.unlocks || entry.title || entry.codeName || "Unknown";
  const rewardType = inferRewardType(unlocksText, entry.unlockCategory);

  return {
    id: unlockId,
    name: entry.title ?? entry.codeName,
    description: entry.description ?? "",
    unlockCategory: entry.unlockCategory,
    sourceGroup: entry.sourceGroup,
    rewardType,
    rewardTargets: [unlocksText],
    rewardValues: [
      {
        rewardType,
        utilityTags: rewardType === "character" ? ["power", "progression"] : ["progression"],
        baseUtility: entry.unlockCategory === "secret" ? 78 : 70
      }
    ],
    prerequisites: [inferPrerequisite(entry, unlockId)],
    isSpoiler: entry.unlockCategory === "secret",
    notes: entry.notes ? [entry.notes] : [],
    wikiRef: `https://vampire.survivors.wiki/w/${entry.unlockCategory === "secret" ? "Secrets" : "Achievements"}`,
    sortOrder: index + 1
  };
}

function groupAndLink(unlocks) {
  const byGroup = new Map();
  for (const unlock of unlocks) {
    const group = unlock.sourceGroup;
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(unlock);
  }

  const links = [];
  for (const groupUnlocks of byGroup.values()) {
    groupUnlocks.sort((a, b) => a.sortOrder - b.sortOrder);
    for (let i = 0; i < groupUnlocks.length - 1; i += 1) {
      links.push({
        fromUnlockId: groupUnlocks[i].id,
        toUnlockId: groupUnlocks[i + 1].id,
        relation: "enables",
        strength: "medium"
      });
    }
  }

  return links;
}

async function main() {
  const normalizedPath = resolve(process.cwd(), "data/import/wiki.normalized.json");
  const seedPath = resolve(process.cwd(), "data/unlocks/unlocks.seed.json");

  const raw = await readFile(normalizedPath, "utf8");
  const normalized = JSON.parse(raw);

  const selectedAchievements = normalized.achievements.slice(0, 40);
  const selectedSecrets = normalized.secrets.slice(0, 20);
  const combined = [...selectedAchievements, ...selectedSecrets];

  const unlocks = combined.map((entry, index) => buildUnlockEntry(entry, index));
  const dependencyLinks = groupAndLink(unlocks);

  const seed = {
    meta: {
      datasetVersion: "0.2.0",
      gamePatch: "1.15.100",
      lastUpdatedAt: new Date().toISOString().slice(0, 10),
      source: "vampire.survivors.wiki"
    },
    unlocks,
    dependencyLinks
  };

  await writeFile(seedPath, JSON.stringify(seed, null, 2), "utf8");

  console.log(`Wrote seed dataset -> ${seedPath}`);
  console.log(`Unlocks: ${unlocks.length}, dependencyLinks: ${dependencyLinks.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
