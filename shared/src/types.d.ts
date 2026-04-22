export declare const UnlockCategories: readonly ["standard", "secret"];
export type UnlockCategory = (typeof UnlockCategories)[number];
export declare const SourceGroups: readonly ["base", "moonspell", "foscari", "emergency_meeting", "operation_guns", "ode_to_castlevania", "emerald_diorama", "ante_chamber", "extra"];
export type SourceGroup = (typeof SourceGroups)[number];
export declare const RewardTypes: readonly ["character", "weapon", "relic", "stage", "gold", "feature"];
export type RewardType = (typeof RewardTypes)[number];
export declare const UtilityTags: readonly ["progression", "economy", "power", "access", "meta"];
export type UtilityTag = (typeof UtilityTags)[number];
export declare const PrerequisiteTypes: readonly ["unlock", "level", "time_survived", "enemy_kills", "item_find", "evolution", "stage_clear", "collection_count", "secret_hint"];
export type PrerequisiteType = (typeof PrerequisiteTypes)[number];
export declare const PrerequisiteScopes: readonly ["run", "lifetime"];
export type PrerequisiteScope = (typeof PrerequisiteScopes)[number];
export declare const DependencyRelations: readonly ["requires", "enables", "soft_synergy"];
export type DependencyRelation = (typeof DependencyRelations)[number];
export declare const DependencyStrengths: readonly ["hard", "medium", "low"];
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
