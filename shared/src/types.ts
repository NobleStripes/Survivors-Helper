export const UnlockCategories = ["standard", "secret"] as const;
export type UnlockCategory = (typeof UnlockCategories)[number];

export const SourceGroups = [
  "base",
  "moonspell",
  "foscari",
  "emergency_meeting",
  "operation_guns",
  "ode_to_castlevania",
  "emerald_diorama",
  "ante_chamber",
  "extra"
] as const;
export type SourceGroup = (typeof SourceGroups)[number];

export const RewardTypes = ["character", "weapon", "relic", "stage", "gold", "feature"] as const;
export type RewardType = (typeof RewardTypes)[number];

export const UtilityTags = ["progression", "economy", "power", "access", "meta"] as const;
export type UtilityTag = (typeof UtilityTags)[number];

export const PrerequisiteTypes = [
  "unlock",
  "level",
  "time_survived",
  "enemy_kills",
  "item_find",
  "evolution",
  "stage_clear",
  "collection_count",
  "secret_hint"
] as const;
export type PrerequisiteType = (typeof PrerequisiteTypes)[number];

export const PrerequisiteScopes = ["run", "lifetime"] as const;
export type PrerequisiteScope = (typeof PrerequisiteScopes)[number];

export const DependencyRelations = ["requires", "enables", "soft_synergy"] as const;
export type DependencyRelation = (typeof DependencyRelations)[number];

export const DependencyStrengths = ["hard", "medium", "low"] as const;
export type DependencyStrength = (typeof DependencyStrengths)[number];

export interface Prerequisite {
  id: string;
  type: PrerequisiteType;
  subject: string;
  operator: "eq" | "neq" | "gte" | "lte";
  value: number | string;
  scope: PrerequisiteScope;
  sourceUnlockId: string;
}

export interface DependencyLink {
  fromUnlockId: string;
  toUnlockId: string;
  relation: DependencyRelation;
  strength: DependencyStrength;
}

export interface RewardValue {
  rewardType: RewardType;
  utilityTags: UtilityTag[];
  baseUtility: number;
}

export interface UnlockEntry {
  id: string;
  name: string;
  description: string;
  unlockCategory: UnlockCategory;
  sourceGroup: SourceGroup;
  rewardType: RewardType;
  rewardTargets: string[];
  rewardValues: RewardValue[];
  prerequisites: Prerequisite[];
  isSpoiler: boolean;
  notes: string[];
  wikiRef: string;
  sortOrder: number;
}

export interface DatasetMeta {
  datasetVersion: string;
  gamePatch: string;
  lastUpdatedAt: string;
  source: string;
}

export interface UnlockDataset {
  meta: DatasetMeta;
  unlocks: UnlockEntry[];
  dependencyLinks: DependencyLink[];
}
