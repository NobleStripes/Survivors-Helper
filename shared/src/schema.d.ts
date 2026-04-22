export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validateUnlockDataset(input: unknown): ValidationResult;
