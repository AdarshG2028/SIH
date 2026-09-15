// #5: an AI assistant that explains risks, summarizes history, answers
// railway-maintenance questions and suggests actions — using tool calling
// over this repo's own real data. Never touches ML predictions (per
// docs/ML_BACKEND_INTEGRATION.md's "backend must not retrain models or
// modify the original ML predictions").
//
// Talks to any OpenAI-compatible chat-completions API (AI_BASE_URL /
// AI_API_KEY / AI_MODEL in .env) — Grok (xAI), Groq, or OpenAI itself all
// work here unchanged, so a free-tier provider can be swapped without
// touching this file. No SDK dependency: it's a single JSON POST.
const { fetchAssetDetails } = require("./assetInfo.service");
const { searchStations, fetchStationSummary } = require("./stationDirectory.service");
const { buildOptimizedPlan } = require("./blockPlanBuilder.service");

const isConfigured = () => Boolean(process.env.AI_API_KEY);

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_asset_details",
      description:
        "Full history for one railway asset: inspections, failures, maintenance, usage, current risk score and SHAP explanation. Use this before answering any question about a specific asset ID.",
      parameters: {
        type: "object",
        properties: {
          assetId: { type: "string", description: "e.g. AST000001" },
        },
        required: ["assetId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_stations",
      description:
        "Search real railway stations by code or name. Use this to resolve a station name the user mentions into its code before calling get_station_summary.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Station code or (partial) name" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_station_summary",
      description:
        "Real snapshot for one station: asset counts, risk-level breakdown, pending maintenance tasks by department, overdue maintenance count.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Station code, e.g. AA" },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_plan_summary",
      description:
        "The current real shadow-block maintenance plan: how many blocks, which departments are combined, real vs estimated windows, and blocks-saved/hours-saved versus not combining departments.",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function runTool(name, args) {
  switch (name) {
    case "get_asset_details": {
      const details = await fetchAssetDetails(args.assetId);
      if (!details) return { error: `Asset ${args.assetId} not found` };
      // Trim to what's useful for the model — full inspection/maintenance
      // arrays can be long; recent history plus the current risk picture.
      return {
        asset: details.asset,
        currentRisk: details.risk,
        recentInspections: details.inspections.slice(0, 5),
        recentFailures: details.failures.slice(0, 5),
        recentMaintenance: details.maintenance.slice(0, 5),
        schedule: details.schedule,
        recurringFailureTypes: details.recurringFailureTypes,
        shapExplanation: details.explanation,
      };
    }
    case "search_stations": {
      return await searchStations(args.query, 5);
    }
    case "get_station_summary": {
      const summary = await fetchStationSummary(args.code);
      return summary || { error: `Station ${args.code} not found` };
    }
    case "get_plan_summary": {
      const { optimizedPlan } = await buildOptimizedPlan();
      return {
        totalBlocks: optimizedPlan.totalBlocks,
        totalJobs: optimizedPlan.totalJobs,
        departments: optimizedPlan.departments,
        blocks: optimizedPlan.blocks.map((b) => ({
          blockId: b.blockId,
          sectionId: b.sectionId,
          departments: b.departments,
          window: `${b.serviceDay} ${b.windowStart}-${b.windowEnd}`,
          windowSource: b.windowSource,
          highestRiskScore: b.highestRiskScore,
          reason: b.whyThis?.reason,
        })),
      };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

const SYSTEM_PROMPT = `You are the Railway AI assistant embedded in a maintenance block planning tool for Indian Railways.
You explain asset failure risks, summarize maintenance history, answer railway-maintenance questions, and suggest possible maintenance actions.
Use the provided tools to look up real data before answering anything about a specific asset, station, or the current plan — never guess numbers.
You never change, retrain, or override any ML prediction or risk score; you only explain and summarize what the system already computed.
Be concise and concrete. Cite real figures (risk scores, dates, counts) from the tool results rather than vague language.`;

const MAX_TOOL_ROUNDS = 4;

/**
 * Runs one assistant turn: sends the conversation (+ tools) to the
 * configured model, executes any tool calls it requests against this
 * repo's real data, and loops until it produces a final text reply.
 *
 * @param {Array<{role: string, content: string}>} messages - prior turns, oldest first.
 * @returns {Promise<{reply: string, toolCalls: Array<{name: string, args: object}>}>}
 */
async function chat(messages) {
  if (!isConfigured()) {
    const error = new Error(
      "AI assistant not configured — set AI_API_KEY in Backend/.env (see .env.example).",
    );
    error.status = 503;
    throw error;
  }

  // Defaults match .env.example's verified-working Groq config — a guessed
  // model name isn't worth the 404 when AI_MODEL is left unset.
  const baseUrl = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
  const model = process.env.AI_MODEL || "openai/gpt-oss-120b";

  const conversation = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
  const toolCallLog = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: conversation,
        tools: TOOLS,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const error = new Error(`AI provider returned ${res.status}: ${body.slice(0, 300)}`);
      error.status = 502;
      throw error;
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      const error = new Error("AI provider returned no message");
      error.status = 502;
      throw error;
    }

    if (!message.tool_calls?.length) {
      return { reply: message.content || "", toolCalls: toolCallLog };
    }

    conversation.push(message);

    for (const call of message.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        // Leave args empty rather than fail the whole turn over one bad call.
      }

      toolCallLog.push({ name: call.function.name, args });
      const result = await runTool(call.function.name, args);

      conversation.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  const error = new Error("AI assistant made too many tool calls without a final answer");
  error.status = 502;
  throw error;
}

module.exports = { chat, isConfigured };
