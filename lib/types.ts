// ─── Biomarker Status ────────────────────────────────────────────────────────
// Represents the three possible classification states for a biomarker result.
// "optimal"      → within the longevity-optimal range (tighter than lab range)
// "normal"       → within the standard lab reference range but not optimal
// "out_of_range" → outside the lab reference range entirely
export type BiomarkerStatus = 'optimal' | 'normal' | 'out_of_range';

// ─── Reference Range ─────────────────────────────────────────────────────────
// A numeric range with optional lower and upper bounds.
export interface ReferenceRange {
    min: number | null; // lower bound of the range, null if no lower limit
    max: number | null; // upper bound of the range, null if no upper limit
}

// ─── Biomarker ───────────────────────────────────────────────────────────────
// A single extracted and classified biomarker from the lab report.
export interface Biomarker {
    name: string;             // standardized English name (e.g. "LDL Cholesterol")
    category: string;         // panel grouping (e.g. "Lipid Panel", "Complete Blood Count")
    value: number;            // numeric result value from the report
    unit: string;             // standardized unit (e.g. "mg/dL", "g/L")
    referenceRange: ReferenceRange;  // standard lab printed reference range
    optimalRange: ReferenceRange;    // longevity-optimal range, adjusted for age and sex
    status: BiomarkerStatus;         // classification against the lab reference range
    optimalStatus: BiomarkerStatus;  // classification against the longevity-optimal range
    flag: 'HIGH' | 'LOW' | null;     // direction flag if out of range, null if within range
    note: string;                    // one-sentence clinical insight for the patient
}

// ─── Patient ─────────────────────────────────────────────────────────────────
// Demographic data extracted directly from the lab report header.
// Used to adjust optimal range thresholds by age and sex.
export interface Patient {
    age: number;              // calculated from date of birth on the report
    sex: 'male' | 'female';  // biological sex as stated on the report
    bloodType?: string;       // ABO blood group if present on the report (optional)
}

// ─── Lab Report ──────────────────────────────────────────────────────────────
// The top-level structured output returned by the AI analysis pipeline.
// Contains patient context and the full list of extracted biomarkers.
export interface LabReport {
    patient: Patient;         // demographic data parsed from the report
    reportDate: string;       // ISO date string of the report (YYYY-MM-DD)
    biomarkers: Biomarker[];  // all extracted and classified biomarkers
}

// ─── API Response ────────────────────────────────────────────────────────────
// Shape of the JSON response returned by the /api/analyze route.
// On success, data contains the full LabReport.
// On failure, error contains a human-readable message.
export interface AnalyzeResponse {
    success: boolean;    // true if analysis completed without error
    data?: LabReport;   // updated on success
    error?: string;     // updated on failure
}
