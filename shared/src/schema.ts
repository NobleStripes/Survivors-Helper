import {
  DependencyRelations,
  DependencyStrengths,
  PrerequisiteScopes,
  PrerequisiteTypes,
  RewardTypes,
  SourceGroups,
  UnlockCategories,
  UtilityTags,
  type UnlockDataset
} from "./types.js";

const has = <T extends readonly string[]>(arr: T, value: string): boolean => arr.includes(value);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateUnlockDataset(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Dataset must be an object"] };
  }

  const dataset = input as Partial<UnlockDataset>;

  if (!dataset.meta) {
    errors.push("meta is required");
  } else {
    if (!dataset.meta.datasetVersion) errors.push("meta.datasetVersion is required");
    if (!dataset.meta.gamePatch) errors.push("meta.gamePatch is required");
    if (!dataset.meta.lastUpdatedAt) errors.push("meta.lastUpdatedAt is required");
    if (!dataset.meta.source) errors.push("meta.source is required");
  }

  if (!Array.isArray(dataset.unlocks)) {
    errors.push("unlocks must be an array");
  }

  if (!Array.isArray(dataset.dependencyLinks)) {
    errors.push("dependencyLinks must be an array");
  }

  const seenIds = new Set<string>();

  for (const unlock of dataset.unlocks ?? []) {
    if (!unlock.id) errors.push("unlock.id is required");
    if (unlock.id && seenIds.has(unlock.id)) errors.push(`duplicate unlock id: ${unlock.id}`);
    if (unlock.id) seenIds.add(unlock.id);

    if (!has(UnlockCategories, unlock.unlockCategory)) {
      errors.push(`invalid unlockCategory for ${unlock.id}`);
    }
    if (!has(SourceGroups, unlock.sourceGroup)) {
      errors.push(`invalid sourceGroup for ${unlock.id}`);
    }
    if (!has(RewardTypes, unlock.rewardType)) {
      errors.push(`invalid rewardType for ${unlock.id}`);
    }
    if (!Array.isArray(unlock.rewardTargets)) {
      errors.push(`rewardTargets must be an array for ${unlock.id}`);
    }
    if (!Array.isArray(unlock.prerequisites)) {
      errors.push(`prerequisites must be an array for ${unlock.id}`);
    }

    for (const rv of unlock.rewardValues ?? []) {
      if (!has(RewardTypes, rv.rewardType)) errors.push(`invalid rewardValues.rewardType for ${unlock.id}`);
      if (typeof rv.baseUtility !== "number" || rv.baseUtility < 0 || rv.baseUtility > 100) {
        errors.push(`baseUtility must be between 0 and 100 for ${unlock.id}`);
      }
      for (const tag of rv.utilityTags ?? []) {
        if (!has(UtilityTags, tag)) errors.push(`invalid utilityTag '${tag}' for ${unlock.id}`);
      }
    }

    for (const pre of unlock.prerequisites ?? []) {
      if (!has(PrerequisiteTypes, pre.type)) errors.push(`invalid prerequisite type for ${unlock.id}`);
      if (!has(PrerequisiteScopes, pre.scope)) errors.push(`invalid prerequisite scope for ${unlock.id}`);
    }
  }

  for (const link of dataset.dependencyLinks ?? []) {
    if (!seenIds.has(link.fromUnlockId)) errors.push(`dependency fromUnlockId not found: ${link.fromUnlockId}`);
    if (!seenIds.has(link.toUnlockId)) errors.push(`dependency toUnlockId not found: ${link.toUnlockId}`);
    if (!has(DependencyRelations, link.relation)) errors.push(`invalid dependency relation: ${link.relation}`);
    if (!has(DependencyStrengths, link.strength)) errors.push(`invalid dependency strength: ${link.strength}`);
  }

  return { valid: errors.length === 0, errors };
}
