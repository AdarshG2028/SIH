export type Department =
  "Engineering" | "Signal & Telecommunication (S&T)" | "Traction Distribution (TRD)";

export const DEPARTMENTS: Department[] = [
  "Engineering",
  "Signal & Telecommunication (S&T)",
  "Traction Distribution (TRD)",
];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const EQUIPMENT_OPTIONS = [
  "Tamping Machine",
  "Tower Wagon",
  "Signal Testing Equipment",
  "Rail Crane",
  "Track Recording Car",
] as const;

/** Section ids understood by the block-request evaluator (operational_constraints.json). */
export const SECTIONS = ["LNL-PUNE", "BPL", "RKMP"] as const;

/** Corridor ids used by the TMS / SMMS / TDMS task data — what-if and plan generation filter on these. */
export const CORRIDORS = ["LNL-PUNE", "BPL-RKMP"] as const;

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const BLOCK_REQUEST_STATUSES = [
  "recommended",
  "needs_review",
  "accepted",
  "rejected",
] as const;

/** Department names used by backend Task documents (taskAdapter.service departmentMap). */
export const TASK_DEPARTMENTS = ["Track", "OHE", "Signalling"] as const;

export const TASK_TYPES = ["Defect", "Maintenance"] as const;

export const CRITICALITY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;

export const URGENCY_OPTIONS = ["Flexible", "Short-term", "Urgent"] as const;

/** Datasets accepted by POST /import/:dataset (import.controller models map). */
export const IMPORT_DATASETS = [
  { id: "assets", label: "Assets" },
  { id: "inspections", label: "Inspections" },
  { id: "asset_usage", label: "Asset usage" },
  { id: "failure_events", label: "Failure events" },
  { id: "maintenance_history", label: "Maintenance history" },
  { id: "maintenance_schedule", label: "Maintenance schedule" },
] as const;

export type Window = {
  date?: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  trafficLevel?: string;
  trafficScore?: number;
  weatherSuitable?: boolean;
  overallScore?: number;
  score?: number;
  optionId?: string;
};

export type AssetRisk = {
  asset_id: string;
  snapshot_date?: string;
  risk_probability?: number;
  risk_score?: number;
  risk_level?: string;
  recommended_action?: string;
  predicted_probability?: number;
  predicted_class?: number | string;
};

export type Decision = {
  requestId?: string;
  status?: string;
  sectionId?: string;
  fromLocation?: string;
  toLocation?: string;
  fromKm?: number;
  toKm?: number;
  linearSpanKm?: number;
  lineConfiguration?: string;
  department?: string;
  maintenanceType?: string;
  priority?: string;
  userPreferences?: Record<string, unknown>;
  safetyProtocols?: {
    speedRestriction?: string;
    safetyPrecautions?: string | string[];
    powerBlockRequired?: boolean;
    trafficBlockRequired?: boolean;
  };
  recommendedWindow?: Window;
  multiDepartmentCoordination?: {
    integratedDepartments?: string[];
    isMultiDepartment?: boolean;
    downtimeSavedHours?: number;
    primaryTask?: Record<string, unknown>;
    coLocatedTasks?: Array<Record<string, unknown>>;
  };
  interDepartmentSequencing?: Array<{
    phase?: number;
    timeWindow?: string;
    department?: string;
    safetyAction?: string;
    operatingProtocol?: string;
  }>;
  corridorStarvationAnalysis?: Record<string, unknown>;
  blockProductivityAndBuffers?: Record<string, unknown>;
  specialTrafficCalendar?: Record<string, unknown>;
  reasons?: string[];
  alternativeOptions?: Window[];
};

export type BlockRequest = {
  _id?: string;
  id?: string;
  requestId: string;
  sectionId?: string;
  department?: string;
  maintenanceType?: string;
  fromKm?: number;
  toKm?: number;
  preferredDate?: string;
  input?: Record<string, unknown>;
  decision?: Decision;
  status?: string;
  selectedWindow?: Window;
  assetRisk?: AssetRisk | null;
  auditTrail?: Array<{ action?: string; at?: string; by?: string; note?: string }>;
  createdAt?: string;
  updatedAt?: string;
};

export type Kpis = {
  evaluation_summary?: {
    title?: string;
    prototype_disclaimer?: string;
    corridor?: string;
    evaluation_period?: string;
  };
  before_vs_after?: Record<string, Record<string, unknown>>;
  kpis?: Record<string, number>;
};

export type WhatIfResult = {
  simulation_query?: Record<string, unknown>;
  has_conflict?: boolean;
  conflict_summary?: Record<string, number>;
  conflicting_trains?: Array<{
    train_number?: string;
    train_name?: string;
    train_type?: string;
    scheduled_passage?: string;
    priority?: string;
    estimated_delay_minutes?: number;
  }>;
  recommended_alternative?: {
    start_time?: string;
    end_time?: string;
    conflicts?: number;
    note?: string;
  };
  recommendation?: string;
};

export type GeneratedBlock = {
  block_id: string;
  date?: string;
  corridor?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  duration?: string | number;
  selected_tasks?: Array<{
    task_id?: string;
    department?: string;
    task_type?: string;
    asset_id?: string;
    priority_score?: number;
    priority_level?: string;
    estimated_duration?: string | number;
  }>;
  departments?: string[];
  affected_assets?: string[];
  affected_trains?: Array<{
    train_number?: string;
    train_name?: string;
    rake_type?: string;
    entry_time?: string;
    exit_time?: string;
    can_be_regulated?: boolean;
    delay_minutes?: number;
  }>;
  optimization_score?: number;
  reason_recommendation?: string;
};

export type PlanResult = {
  planning_horizon?: string;
  start_date?: string;
  end_date?: string;
  corridor?: string;
  total_tasks_processed?: number;
  generated_blocks?: GeneratedBlock[];
  task_priorities?: PriorityResult[];
  conflicts?: unknown[];
  kpis?: Record<string, number>;
  before_vs_after_evaluation?: Record<string, unknown>;
  recommendations?: string[];
};

export type PriorityResult = {
  task_id?: string;
  priority_score?: number;
  priority_level?: string;
  major_contributing_factors?: string[];
  raw_task_reference?: Record<string, unknown>;
};

export type RiskRow = {
  asset_id: string;
  snapshot_date?: string;
  predicted_probability?: number;
  predicted_class?: number | string;
  risk_probability?: number;
  risk_score?: number;
  risk_level?: string;
  recommended_action?: string;
};

export type RiskExplanation = Record<string, string | number | undefined> & {
  asset_id?: string;
  snapshot_date?: string;
  ensemble_probability?: number;
  risk_level?: string;
};

export type ApprovalStatus = {
  blockId: string;
  status: string;
  departmentApprovedAt?: string;
  drmApprovedAt?: string;
  bdmsSubmittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const APPROVAL_STAGES = [
  "recommended",
  "department_approved",
  "drm_approved",
  "bdms_submitted",
] as const;

export type Asset = {
  _id?: string;
  asset_id: string;
  asset_type?: string;
  station_code?: string;
  station_name?: string;
  installation_date?: string;
  asset_age_years?: number;
  expected_life_years?: number;
  initial_condition_score?: number;
  createdAt?: string;
};

export type Inspection = {
  inspection_id?: string;
  inspection_date?: string;
  condition_score?: number;
  wear_level?: number;
  defect_count?: number;
  inspector_id?: string;
  inspection_status?: string;
};

export type AssetUsage = {
  usage_id?: string;
  usage_month?: string;
  train_passages?: number;
  usage_index?: number;
  cumulative_usage?: number;
};

export type FailureEvent = {
  failure_id?: string;
  failure_date?: string;
  failure_type?: string;
  severity?: string;
  downtime_hours?: number;
  resolved?: string;
};

export type MaintenanceRecord = {
  maintenance_id?: string;
  maintenance_date?: string;
  maintenance_type?: string;
  maintenance_reason?: string;
  downtime_hours?: number;
  cost_inr?: number;
  technician_team?: string;
};

export type MaintenanceSchedule = {
  schedule_id?: string;
  last_maintenance_date?: string;
  maintenance_interval_days?: number;
  next_scheduled_date?: string;
  maintenance_priority?: string;
};

export type AssetDetails = {
  asset: Asset;
  inspections: Inspection[];
  usage: AssetUsage[];
  failures: FailureEvent[];
  maintenance: MaintenanceRecord[];
  schedule: MaintenanceSchedule | null;
  risk: RiskRow | null;
  explanation: RiskExplanation | null;
};

export type Task = {
  _id?: string;
  taskId: string;
  department: string;
  sectionId: string;
  assetId?: string;
  taskType: string;
  description?: string;
  criticalityScore?: number;
  dueDate?: string;
  status?: string;
  source?: string;
  risk?: {
    riskLevel?: string;
    riskScore?: number;
    predictedProbability?: number;
    recommendedAction?: string;
  } | null;
};

export type DemoBlockTask = {
  taskId: string;
  assetId?: string;
  department?: string;
  taskType?: string;
  riskScore?: number;
  riskLevel?: string;
  findingCount?: number;
};

export type DemoBlock = {
  blockId: string;
  sectionId?: string;
  serviceDay?: string;
  windowStart?: string;
  windowEnd?: string;
  durationMinutes?: number;
  tasks: DemoBlockTask[];
  departments: string[];
  averageRiskScore?: number;
  highestRiskScore?: number;
  affectedTrains?: number;
  predictedDelayMinutes?: number;
  estimatedPrice?: number;
  recommendation?: string;
  optimizationScore?: number;
  whyThis?: {
    highestRisk?: number;
    departmentsCombined?: string[];
    jobsIncluded?: number;
    reason?: string;
    pushedAside?: DemoBlockTask[];
  };
};

export type OptimizedDemoPlan = {
  totalBlocks: number;
  totalJobs: number;
  departments: string[];
  totalPredictedDelayMinutes: number;
  estimatedTotalPrice: number;
  blocks: DemoBlock[];
};

export type PeriodJob = DemoBlockTask & { executionSlot?: string };

export type PeriodPlan = {
  monthlyPlan: {
    period: string;
    objective: string;
    reservedBlocks: number;
    reservedJobs: number;
    departments: string[];
    jobs: PeriodJob[];
  };
  weeklyPlan: {
    period: string;
    objective: string;
    plannedBlocks: number;
    plannedJobs: number;
    departments: string[];
    jobs: PeriodJob[];
  };
};

export type BulkImportStats = { processed: number; inserted?: number; updated?: number };

export type MlImportResult = {
  riskScores: BulkImportStats;
  ensemblePredictions: BulkImportStats;
  explanations: BulkImportStats;
};

export type TaskGenerationStats = { created: number; matched?: number; message?: string };
