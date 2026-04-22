import type { DependencyLink, UnlockDataset, UnlockEntry, UtilityTag } from "@survivors-helper/shared";

export interface RecommendationWeights {
  effort: number;
  depth: number;
  utility: number;
  chain: number;
  dlcAvailability: number;
  secretComplexity: number;
}

export const defaultWeights: RecommendationWeights = {
  effort: 0.22,
  depth: 0.16,
  utility: 0.24,
  chain: 0.20,
  dlcAvailability: 0.10,
  secretComplexity: 0.08
};

export interface RecommendationInput {
  completedUnlockIds: string[];
  ownedSourceGroups: string[];
  includeSecrets: boolean;
  utilityPreference: Partial<Record<UtilityTag, number>>;
  weights?: Partial<RecommendationWeights>;
}

export interface RecommendationResult {
  unlockId: string;
  finalScore: number;
  scores: {
    effort: number;
    depth: number;
    utility: number;
    chain: number;
    dlcAvailability: number;
    secretComplexity: number;
  };
  why: string[];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((acc, n) => acc + n, 0) / nums.length;
}

function prerequisiteEffort(unlock: UnlockEntry): number {
  const base = 100 - unlock.prerequisites.length * 12;
  return clamp(base);
}

function dependencyDepthScore(unlock: UnlockEntry): number {
  const base = 100 - unlock.prerequisites.filter((p) => p.type === "unlock").length * 20;
  return clamp(base);
}

function utilityScore(unlock: UnlockEntry, preference: Partial<Record<UtilityTag, number>>): number {
  const values = unlock.rewardValues.map((v) => {
    const pref = average(v.utilityTags.map((tag) => preference[tag] ?? 1));
    return clamp(v.baseUtility * pref);
  });
  return clamp(average(values));
}

function chainValueScore(unlockId: string, links: DependencyLink[]): number {
  const direct = links.filter((l) => l.fromUnlockId === unlockId && l.relation === "enables");
  const hardBoost = direct.filter((d) => d.strength === "hard").length * 20;
  const mediumBoost = direct.filter((d) => d.strength === "medium").length * 10;
  const lowBoost = direct.filter((d) => d.strength === "low").length * 5;
  return clamp(20 + hardBoost + mediumBoost + lowBoost);
}

function dlcAvailabilityScore(unlock: UnlockEntry, ownedGroups: string[]): number {
  return ownedGroups.includes(unlock.sourceGroup) || unlock.sourceGroup === "base" ? 100 : 0;
}

function secretComplexityScore(unlock: UnlockEntry): number {
  if (unlock.unlockCategory === "standard") return 100;
  return clamp(60 - unlock.prerequisites.length * 6);
}

export function recommendUnlocks(dataset: UnlockDataset, input: RecommendationInput): RecommendationResult[] {
  const w = { ...defaultWeights, ...(input.weights ?? {}) };
  const completed = new Set(input.completedUnlockIds);

  const candidates = dataset.unlocks.filter((unlock) => {
    if (completed.has(unlock.id)) return false;
    if (!input.includeSecrets && unlock.unlockCategory === "secret") return false;
    return true;
  });

  return candidates
    .map((unlock) => {
      const effort = prerequisiteEffort(unlock);
      const depth = dependencyDepthScore(unlock);
      const utility = utilityScore(unlock, input.utilityPreference);
      const chain = chainValueScore(unlock.id, dataset.dependencyLinks);
      const dlcAvailability = dlcAvailabilityScore(unlock, input.ownedSourceGroups);
      const secretComplexity = secretComplexityScore(unlock);

      const finalScore =
        w.effort * effort +
        w.depth * depth +
        w.utility * utility +
        w.chain * chain +
        w.dlcAvailability * dlcAvailability +
        w.secretComplexity * secretComplexity;

      const why: string[] = [];
      if (chain >= 60) why.push("opens_future_unlocks");
      if (utility >= 70) why.push("high_utility_reward");
      if (effort >= 70) why.push("quick_win");
      if (unlock.unlockCategory === "secret") why.push("secret_unlock");

      return {
        unlockId: unlock.id,
        finalScore,
        scores: { effort, depth, utility, chain, dlcAvailability, secretComplexity },
        why: why.slice(0, 3),
        sortOrder: unlock.sortOrder
      };
    })
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      if (b.scores.chain !== a.scores.chain) return b.scores.chain - a.scores.chain;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.unlockId.localeCompare(b.unlockId);
    })
    .map(({ sortOrder: _, ...result }) => ({
      ...result,
      finalScore: Number(result.finalScore.toFixed(2))
    }));
}
