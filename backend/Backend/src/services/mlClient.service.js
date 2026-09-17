// 127.0.0.1, not localhost: Node resolves localhost to ::1 first, and the
// Python server only listens on IPv4.
const DEFAULT_ML_API_URL = "http://127.0.0.1:8000";
const DEFAULT_ML_TIMEOUT_MS = 15000;

const getMlApiUrl = () =>
  process.env.ML_SERVICE_URL || process.env.ML_API_URL || DEFAULT_ML_API_URL;

const createError = (status, message, details) => {
  const error = new Error(message);
  error.status = status;

  if (details !== undefined) {
    error.details = details;
  }

  return error;
};

const callML = async (endpoint, options = {}) => {
  const mlApiUrl = getMlApiUrl();
  const timeoutMs = Number(process.env.ML_TIMEOUT_MS) || DEFAULT_ML_TIMEOUT_MS;

  let response;

  try {
    response = await fetch(`${mlApiUrl}${endpoint}`, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    // Connection refused, DNS failure or timeout: the Python server is not reachable.
    throw createError(
      503,
      `ML service unavailable at ${mlApiUrl}`,
      error.cause?.code || error.name,
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw createError(502, `ML service returned ${response.status}`, body);
  }

  return body;
};

const postML = (endpoint, payload = {}) =>
  callML(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

const evaluateBlockRequest = (payload) =>
  postML("/api/ai/user-request", payload);

const simulateWhatIf = (payload) => postML("/api/ai/what-if", payload);

const generatePlan = (payload) => postML("/api/ai/generate-plan", payload);

// Plans one officer's block request — returns the window options the form shows.
const planRequest = (payload) => postML("/api/ai/plan-request", payload);

const scorePriority = (payload) => postML("/api/ai/priority", payload);

const getKpis = () => callML("/api/ai/kpis");

const checkMlHealth = () => callML("/api/health");

module.exports = {
  getMlApiUrl,
  evaluateBlockRequest,
  simulateWhatIf,
  generatePlan,
  planRequest,
  scorePriority,
  getKpis,
  checkMlHealth,
};
