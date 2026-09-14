import { queryOptions } from "@tanstack/react-query";
import { apiGet, qs } from "./api";
import type {
  ApprovalStatus,
  Asset,
  AssetDetails,
  BlockRequest,
  DemoBlock,
  Kpis,
  OptimizedDemoPlan,
  PeriodPlan,
  RiskExplanation,
  RiskRow,
  Task,
} from "./types";

export const backendHealthQuery = queryOptions({
  queryKey: ["backend-health"],
  queryFn: async () => (await apiGet<never>("/health")).message ?? "UP",
  retry: false,
  staleTime: 30_000,
});

export const healthQuery = queryOptions({
  queryKey: ["ai-health"],
  queryFn: async () =>
    (
      await apiGet<{ mlApiUrl?: string; status?: string; service?: string; version?: string }>(
        "/ai/health",
      )
    ).data,
  retry: false,
  staleTime: 30_000,
});

export const kpisQuery = queryOptions({
  queryKey: ["kpis"],
  queryFn: async () => (await apiGet<Kpis>("/ai/kpis")).data,
  retry: false,
});

export function blockRequestsQuery(
  filters: { status?: string; sectionId?: string; limit?: number } = {},
) {
  return queryOptions({
    queryKey: ["block-requests", filters],
    queryFn: async () => {
      const res = await apiGet<BlockRequest[]>(`/ai/block-requests${qs(filters)}`);
      return res.data ?? [];
    },
    retry: false,
  });
}

export function blockRequestQuery(requestId: string) {
  return queryOptions({
    queryKey: ["block-request", requestId],
    queryFn: async () =>
      (await apiGet<BlockRequest>(`/ai/block-requests/${encodeURIComponent(requestId)}`)).data,
    retry: false,
  });
}

export function risksQuery(filters: {
  riskLevel?: string;
  minScore?: string;
  maxScore?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return queryOptions({
    queryKey: ["risks", filters],
    queryFn: async () => {
      const res = await apiGet<RiskRow[]>(`/risks${qs(filters)}`);
      return { rows: res.data ?? [], pagination: res.pagination };
    },
    retry: false,
  });
}

export function riskCountQuery(level: string) {
  return queryOptions({
    queryKey: ["risk-count", level],
    queryFn: async () => {
      const res = await apiGet<RiskRow[]>(`/risks${qs({ riskLevel: level, limit: 1 })}`);
      return res.pagination?.total ?? 0;
    },
    retry: false,
  });
}

export function riskQuery(assetId: string) {
  return queryOptions({
    queryKey: ["risk", assetId],
    queryFn: async () => (await apiGet<RiskRow>(`/risks/${encodeURIComponent(assetId)}`)).data,
    retry: false,
  });
}

export function riskExplanationQuery(assetId: string) {
  return queryOptions({
    queryKey: ["risk-explanation", assetId],
    queryFn: async () =>
      (await apiGet<RiskExplanation>(`/risks/${encodeURIComponent(assetId)}/explanation`)).data,
    retry: false,
  });
}

export function approvalQuery(blockId: string) {
  return queryOptions({
    queryKey: ["approval", blockId],
    queryFn: async () =>
      (await apiGet<ApprovalStatus>(`/approvals/${encodeURIComponent(blockId)}`)).data,
    retry: false,
  });
}

export type TaskFilters = {
  department?: string;
  sectionId?: string;
  taskType?: string;
  minScore?: string;
  maxScore?: string;
  dueBefore?: string;
  dueAfter?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export function tasksQuery(filters: TaskFilters) {
  return queryOptions({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      const res = await apiGet<Task[]>(`/tasks${qs(filters)}`);
      return { rows: res.data ?? [], pagination: res.pagination };
    },
    retry: false,
  });
}

export const taskCountQuery = queryOptions({
  queryKey: ["task-count"],
  queryFn: async () => (await apiGet<Task[]>("/tasks?limit=1")).pagination?.total ?? 0,
  retry: false,
});

/** GET /assets returns every asset unpaginated, so it's fetched once and filtered client-side. */
export const assetsQuery = queryOptions({
  queryKey: ["assets"],
  queryFn: async () => (await apiGet<Asset[]>("/assets")).data ?? [],
  retry: false,
  staleTime: 60_000,
});

export function assetQuery(assetId: string) {
  return queryOptions({
    queryKey: ["asset", assetId],
    queryFn: async () => (await apiGet<Asset>(`/assets/${encodeURIComponent(assetId)}`)).data,
    retry: false,
  });
}

export function assetDetailsQuery(assetId: string) {
  return queryOptions({
    queryKey: ["asset-details", assetId],
    queryFn: async () =>
      (await apiGet<AssetDetails>(`/assets/${encodeURIComponent(assetId)}/details`)).data,
    retry: false,
  });
}

export const demoPlanQuery = queryOptions({
  queryKey: ["planning-demo"],
  queryFn: async () => {
    const res = await apiGet<DemoBlock[]>("/planning/demo");
    return {
      blocks: res.data ?? [],
      optimizedPlan: res.optimizedPlan as OptimizedDemoPlan | undefined,
    };
  },
  retry: false,
});

export const periodPlanQuery = queryOptions({
  queryKey: ["planning-periods"],
  queryFn: async () => (await apiGet<PeriodPlan>("/planning/periods")).data,
  retry: false,
});

/** "numeric__total_maintenance_cost (+0.0129)" -> { label, value } */
export function parseShapReason(raw: unknown): { label: string; value: number | null } | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const match = raw.match(/\(([+-]?[\d.]+)\)\s*$/);
  const value = match ? Number(match[1]) : null;
  const label = raw
    .replace(/\(([+-]?[\d.]+)\)\s*$/, "")
    .replace(/^(numeric__|categorical__)/, "")
    .replace(/_/g, " ")
    .trim();
  return { label, value: Number.isFinite(value as number) ? (value as number) : null };
}
