import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { assistantStatusQuery } from "@/lib/queries";
import { useAssistantChat } from "@/lib/actions";
import type { AssistantMessage } from "@/lib/types";
import {
  ChromeButton,
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Tag,
  TextInput,
} from "@/components/control";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — Railway AI Block Planner" },
      {
        name: "description",
        content: "Ask about asset risk, station status, or the current maintenance plan — grounded in real data.",
      },
    ],
  }),
  component: AssistantPage,
});

const SUGGESTIONS = [
  "Why is AST000001 high risk?",
  "Summarize the maintenance history for AST000001",
  "What's the status of station AA?",
  "What does the current shadow-block plan look like?",
];

function AssistantPage() {
  const status = useQuery(assistantStatusQuery);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const chat = useAssistantChat();

  const send = (text: string) => {
    if (!text.trim() || chat.isPending) return;

    const next: AssistantMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");

    chat.mutate(next, {
      onSuccess: (result) => {
        if (result?.reply) {
          setMessages((cur) => [...cur, { role: "assistant", content: result.reply }]);
        }
      },
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI · ASSISTANT"
        title="Ask about risk, history or the plan"
        intro="Grounded in this system's real data — every answer about a specific asset, station or plan comes from a live lookup, not a guess. It never changes an ML prediction, only explains it."
      />

      {status.data && !status.data.configured ? (
        <Panel title="Not configured">
          <p className="text-sm text-steel">
            The assistant needs an API key. Set <code className="text-signal">AI_API_KEY</code> (and
            optionally <code className="text-signal">AI_BASE_URL</code> /{" "}
            <code className="text-signal">AI_MODEL</code>) in <code className="text-signal">Backend/.env</code>{" "}
            — see <code className="text-signal">.env.example</code>. Any OpenAI-compatible provider works
            (Grok, Groq, OpenAI).
          </p>
        </Panel>
      ) : (
        <Panel title="Conversation">
          <div className="min-h-[16rem] space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <EmptyState
                  title="No messages yet"
                  hint="Try one of these, or ask your own question."
                />
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-md border border-line px-3 py-1.5 font-mono text-[11px] text-steel transition hover:bg-ink3 hover:text-cream"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Tag tone={m.role === "user" ? "steel" : "signal"}>
                    {m.role === "user" ? "You" : "AI"}
                  </Tag>
                  <p className="flex-1 whitespace-pre-wrap text-sm text-cream">{m.content}</p>
                </div>
              ))
            )}
            {chat.isPending ? <Loading label="Looking up real data and thinking…" /> : null}
            {chat.error ? <ErrorNote error={chat.error} title="Assistant failed" /> : null}
          </div>

          <form onSubmit={onSubmit} className="mt-4 flex gap-3">
            <div className="flex-1">
              <TextInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about an asset, station, or the current plan…"
                disabled={chat.isPending}
              />
            </div>
            <ChromeButton type="submit" disabled={chat.isPending || !input.trim()}>
              Send
            </ChromeButton>
          </form>
        </Panel>
      )}
    </div>
  );
}
