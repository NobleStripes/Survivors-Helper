import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import { SourceGroups, UtilityTags, validateUnlockDataset, type UnlockDataset } from "@survivors-helper/shared";
import { recommendUnlocks } from "./recommendation.js";

interface ParsedRecommendationQuery {
  completedUnlockIds: string[];
  ownedSourceGroups: string[];
  includeSecrets: boolean;
  weights: {
    effort?: number;
    depth?: number;
    utility?: number;
    chain?: number;
    dlcAvailability?: number;
    secretComplexity?: number;
  };
  utilityPreference: Partial<Record<(typeof UtilityTags)[number], number>>;
  limit: number;
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  if (value === "1" || value.toLowerCase() === "true") return true;
  if (value === "0" || value.toLowerCase() === "false") return false;
  return fallback;
}

function parseNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseRecommendationQuery(url: URL): ParsedRecommendationQuery {
  const completedUnlockIds = Array.from(new Set(parseCsv(url.searchParams.get("completedUnlockIds"))));

  const requestedGroups = parseCsv(url.searchParams.get("ownedSourceGroups"));
  const validGroups = requestedGroups.filter((group) => SourceGroups.includes(group as (typeof SourceGroups)[number]));
  const ownedSourceGroups = Array.from(new Set(["base", ...validGroups]));

  const includeSecrets = parseBoolean(url.searchParams.get("includeSecrets"), true);

  const weights = {
    effort: parseNumber(url.searchParams.get("weightEffort")),
    depth: parseNumber(url.searchParams.get("weightDepth")),
    utility: parseNumber(url.searchParams.get("weightUtility")),
    chain: parseNumber(url.searchParams.get("weightChain")),
    dlcAvailability: parseNumber(url.searchParams.get("weightDlcAvailability")),
    secretComplexity: parseNumber(url.searchParams.get("weightSecretComplexity"))
  };

  const utilityPreference: Partial<Record<(typeof UtilityTags)[number], number>> = {};
  for (const tag of UtilityTags) {
    const key = `utility_${tag}`;
    const value = parseNumber(url.searchParams.get(key));
    if (value !== undefined) {
      utilityPreference[tag] = value;
    }
  }

  const requestedLimit = Number(url.searchParams.get("limit") ?? 25);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 25;

  return {
    completedUnlockIds,
    ownedSourceGroups,
    includeSecrets,
    weights,
    utilityPreference,
    limit
  };
}

function resolveDatasetPath(): string {
  const currentDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
  const candidates = [
    resolve(process.cwd(), "data/unlocks/unlocks.seed.json"),
    resolve(currentDir, "../../data/unlocks/unlocks.seed.json"),
    resolve(currentDir, "../../../data/unlocks/unlocks.seed.json")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate dataset file. Checked: ${candidates.join(", ")}`);
}

function loadDataset(): UnlockDataset {
  const path = resolveDatasetPath();
  const raw = readFileSync(path, "utf8");
  const json = JSON.parse(raw) as unknown;
  const validation = validateUnlockDataset(json);
  if (!validation.valid) {
    throw new Error(`Dataset validation failed: ${validation.errors.join("; ")}`);
  }
  return json as UnlockDataset;
}

const server = createServer((req, res) => {
  const dataset = loadDataset();

  if (!req.url) {
    res.writeHead(400);
    res.end("Missing URL");
    return;
  }

  const requestUrl = new URL(req.url, "http://localhost");

  if (requestUrl.pathname === "/api/meta") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(dataset.meta));
    return;
  }

  if (requestUrl.pathname === "/api/unlocks") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(dataset.unlocks));
    return;
  }

  if (requestUrl.pathname === "/api/recommendations") {
    try {
      const parsed = parseRecommendationQuery(requestUrl);
      const recommendations = recommendUnlocks(dataset, {
        completedUnlockIds: parsed.completedUnlockIds,
        ownedSourceGroups: parsed.ownedSourceGroups,
        includeSecrets: parsed.includeSecrets,
        utilityPreference: parsed.utilityPreference,
        weights: parsed.weights
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          params: parsed,
          totalCandidates: recommendations.length,
          recommendations: recommendations.slice(0, parsed.limit)
        })
      );
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Invalid recommendation query",
          details: error instanceof Error ? error.message : String(error)
        })
      );
    }
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const isMainModule = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const port = Number(process.env.PORT ?? 4170);
  server.listen(port, () => {
    console.log(`Backend listening on ${port}`);
  });
}

export { server };
