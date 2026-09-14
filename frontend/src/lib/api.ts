export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  errors?: unknown[] | undefined;
  details?: unknown;
  availableOptions?: unknown[] | undefined;

  constructor(
    message: string,
    status: number,
    extra?: {
      errors?: unknown[] | undefined;
      details?: unknown;
      availableOptions?: unknown[] | undefined;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = extra?.errors;
    this.details = extra?.details;
    this.availableOptions = extra?.availableOptions;
  }

  get isEngineOffline() {
    return this.status === 503;
  }
  get isEngineError() {
    return this.status === 502 || this.status === 503;
  }
  get isBackendUnreachable() {
    return this.status === 0;
  }
}

export function errorMessages(err: unknown): string[] {
  if (err instanceof ApiError) {
    const list = (err.errors ?? [])
      .map((e) => {
        if (typeof e === "string") return e;
        if (e && typeof e === "object") {
          const o = e as Record<string, unknown>;
          const path = typeof o["path"] === "string" ? `${o["path"]}: ` : "";
          const msg =
            typeof o["msg"] === "string"
              ? o["msg"]
              : typeof o["message"] === "string"
                ? o["message"]
                : "";
          if (msg) return `${path}${msg}`;
        }
        return JSON.stringify(e);
      })
      .filter(Boolean);
    const base = list.length ? list : [err.message];
    if (err.availableOptions?.length)
      base.push(`Available options: ${err.availableOptions.join(", ")}`);
    if (err.isEngineOffline)
      base.push("Start the Python engine: python ML/api_server.py (port 8000).");
    return base;
  }
  if (err instanceof Error) return [err.message];
  return ["Something went wrong."];
}

const TIMEOUT_MS = 20_000;
/** CSV imports insert in batches of 1000 rows, so they get far more time. */
const UPLOAD_TIMEOUT_MS = 10 * 60_000;

export type Pagination = { page: number; limit: number; total: number; totalPages: number };

type Envelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
  pagination?: Pagination;
  errors?: unknown[];
  details?: unknown;
  availableOptions?: unknown[];
  // Endpoint-specific top-level fields that sit beside (or instead of) `data`.
  optimizedPlan?: unknown;
  dataset?: string;
  inserted?: number;
  failed?: number;
  defects?: unknown;
  overdueMaintenance?: unknown;
};

async function request<T>(
  path: string,
  init?: { method?: string; body?: unknown; form?: FormData; timeoutMs?: number },
): Promise<Envelope<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? TIMEOUT_MS);
  const isJson = init?.body !== undefined;
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: init?.method ?? "GET",
      // FormData must not get a Content-Type: the browser adds the multipart boundary.
      ...(isJson
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(init.body) }
        : {}),
      ...(init?.form ? { body: init.form } : {}),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === "AbortError") {
      throw new ApiError("The request took too long and was cancelled.", 0);
    }
    throw new ApiError(`Cannot reach the backend at ${API_BASE_URL}.`, 0);
  }
  clearTimeout(timer);

  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    json = null;
  }

  if (!res.ok || !json?.success) {
    throw new ApiError(json?.message ?? `Request failed (${res.status})`, res.status, {
      errors: json?.errors,
      details: json?.details,
      availableOptions: json?.availableOptions,
    });
  }
  return json;
}

export async function apiGet<T>(path: string) {
  return request<T>(path);
}
export async function apiPost<T>(path: string, body?: unknown) {
  return request<T>(path, { method: "POST", body: body ?? {} });
}
export async function apiPatch<T>(path: string, body?: unknown) {
  return request<T>(path, { method: "PATCH", body: body ?? {} });
}
export async function apiUpload<T>(path: string, form: FormData) {
  return request<T>(path, { method: "POST", form, timeoutMs: UPLOAD_TIMEOUT_MS });
}

export function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
