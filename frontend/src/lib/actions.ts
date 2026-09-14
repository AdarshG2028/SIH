import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiPost } from "./api";
import type { PriorityResult, TaskGenerationStats } from "./types";

/** POST /ai/priority — stateless ML scoring, nothing is persisted. */
export function usePriorityScore() {
  return useMutation({
    mutationFn: async (task: Record<string, unknown>) =>
      (await apiPost<PriorityResult>("/ai/priority", task)).data,
  });
}

/** POST /tasks/generate — turns inspections needing attention and overdue schedules into pending tasks. */
export function useGenerateTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiPost<never>("/tasks/generate");
      return {
        defects: res.defects as TaskGenerationStats | undefined,
        overdueMaintenance: res.overdueMaintenance as TaskGenerationStats | undefined,
      };
    },
    onSuccess: ({ defects, overdueMaintenance }) => {
      toast.success(
        `Tasks generated — ${defects?.created ?? 0} defect, ${overdueMaintenance?.created ?? 0} overdue maintenance`,
      );
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["task-count"] });
      void qc.invalidateQueries({ queryKey: ["planning-demo"] });
      void qc.invalidateQueries({ queryKey: ["planning-periods"] });
    },
    onError: (e) => toast.error(e.message),
  });
}
