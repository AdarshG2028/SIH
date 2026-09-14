import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { kpisQuery } from "@/lib/queries";
import { Disclaimer, Lamp, Panel, Tag } from "@/components/control";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Railway AI Block Planner — Shadow Block Planning" },
      {
        name: "description",
        content:
          "AI plans Indian Railways maintenance blocks across Track, S&T and TRD into shared shadow blocks, avoids train conflicts and sequences safety steps.",
      },
      { property: "og:title", content: "Railway AI Block Planner — Shadow Block Planning" },
      {
        property: "og:description",
        content: "One closure, three departments, zero timetable conflicts.",
      },
    ],
  }),
  component: Landing,
});

const CAPABILITIES = [
  {
    tone: "danger" as const,
    label: "FAILURE RISK PREDICTION",
    body: "Ensemble ML scores every asset 0–100 with SHAP-style drivers, so the worst assets get the block first.",
  },
  {
    tone: "signal" as const,
    label: "PRIORITY SCORING",
    body: "Criticality, safety impact, overdue days, urgency, condition and failure probability rolled into one 0–100 score.",
  },
  {
    tone: "steel" as const,
    label: "SHADOW BLOCKING",
    body: "Track, S&T and TRD tasks on the same span are merged into a single closure instead of three.",
  },
  {
    tone: "clear" as const,
    label: "CONFLICT DETECTION",
    body: "Passenger and freight timings are checked, with alternative slots offered when a train would be delayed.",
  },
];

function Landing() {
  const { data, isError } = useQuery(kpisQuery);
  const k = data?.kpis;
  const disclaimer = data?.evaluation_summary?.prototype_disclaimer;

  const pct = (before?: number, after?: number) =>
    before && after !== undefined ? `${Math.round(((after - before) / before) * 100)}%` : "—";

  return (
    <div className="grid grid-cols-12 gap-6">
      <section className="col-span-12 space-y-6 xl:col-span-7">
        <div className="rise">
          <div className="inline-flex items-center gap-2 rounded border border-signal/40 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-signal">
            <Lamp tone="signal" />
            SMART INDIA HACKATHON · PROTOTYPE
          </div>
          <h1 className="mt-4 font-display text-[clamp(40px,6vw,72px)] font-bold uppercase leading-[0.92] tracking-tight text-balance">
            One closure.
            <br />
            <span className="chrome inline-block rounded-md px-2">Three departments.</span>
          </h1>
          <p className="mt-5 max-w-[52ch] text-pretty text-sm leading-relaxed text-steel">
            AI plans maintenance blocks across Track, S&amp;T and TRD into shared{" "}
            <span className="text-cream">shadow blocks</span>, avoids passenger and freight conflicts, and sequences the
            safety steps between departments — so corridors stop grinding to a halt.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/requests/new"
              className="chrome rounded-md px-5 py-3 font-display text-sm font-semibold uppercase tracking-wide hairline transition hover:brightness-105"
            >
              Request a block
            </Link>
            <Link
              to="/dashboard"
              className="rounded-md border border-line px-5 py-3 font-mono text-[12px] uppercase text-cream transition hover:bg-ink3"
            >
              Open dashboard
            </Link>
          </div>
          <div className="mt-3">
            <Disclaimer text={disclaimer} />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-ink2/80 hairline">
          <div className="flex items-center justify-between border-b border-line bg-ink3/60 px-4 py-2.5">
            <span className="font-mono text-[11px] tracking-[0.2em] text-steel">IMPACT · BEFORE → AFTER</span>
            <span className="font-mono text-[10px] text-signal">
              {data?.evaluation_summary?.corridor ?? "LNL–PUNE"}
            </span>
          </div>
          {isError ? (
            <div className="flex items-center gap-2 px-4 py-5 font-mono text-[11px] text-danger">
              <Lamp tone="danger" /> AI engine offline — impact numbers unavailable.
            </div>
          ) : (
            <div className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
              <div className="border-b border-line p-4 md:border-b-0">
                <div className="label-mono tracking-widest">BLOCKS</div>
                <div className="mt-2 font-display text-2xl font-semibold">
                  <span className="mr-2 text-base text-steel/60 line-through">{k?.["blocksBefore"] ?? 7}</span>
                  <span className="text-signal">{k?.["blocksAfter"] ?? 3}</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-clear">
                  {pct(k?.["blocksBefore"] ?? 7, k?.["blocksAfter"] ?? 3)}
                </div>
              </div>
              <div className="border-b border-line p-4 md:border-b-0">
                <div className="label-mono tracking-widest">BLOCK HOURS</div>
                <div className="mt-2 font-display text-2xl font-semibold">
                  <span className="mr-2 text-base text-steel/60 line-through">{k?.["durationHoursBefore"] ?? 8.5}</span>
                  <span className="text-signal">{k?.["durationHoursAfter"] ?? 5.0}</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-clear">
                  {k?.["downtimeHoursSaved"] ?? 3.5} h saved
                </div>
              </div>
              <div className="p-4">
                <div className="label-mono tracking-widest">CONFLICTS</div>
                <div className="mt-2 font-display text-2xl font-semibold">
                  <span className="mr-2 text-base text-steel/60 line-through">{k?.["conflictsBefore"] ?? 5}</span>
                  <span className="text-clear">{k?.["conflictsAfter"] ?? 0}</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-clear">CLEARED</div>
              </div>
              <div className="bg-signal/5 p-4">
                <div className="label-mono tracking-widest">AVAILABILITY</div>
                <div className="mt-2 font-display text-2xl font-semibold">
                  <span className="mr-2 text-base text-steel/60 line-through">{k?.["availabilityBefore"] ?? 91.4}</span>
                  <span className="text-signal">{k?.["availabilityAfter"] ?? 95.8}</span>
                  <span className="text-sm">%</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-clear">
                  +{k?.["availabilityGainPct"] ?? 4.4}%
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rise grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-ink2/70 p-4 hairline">
            <div className="font-mono text-[10px] tracking-widest text-signal">01 · SUBMIT</div>
            <p className="mt-2 text-xs leading-relaxed text-steel">
              Track, S&amp;T &amp; TRD file a block request with span, preferred window and resources.
            </p>
          </div>
          <div className="rounded-lg bg-ink2/70 p-4 hairline">
            <div className="font-mono text-[10px] tracking-widest text-clear">02 · AI EVALUATES</div>
            <p className="mt-2 text-xs leading-relaxed text-steel">
              Traffic, weather, asset risk and co-located tasks scored into a ranked window plus alternatives.
            </p>
          </div>
          <div className="rounded-lg bg-ink2/70 p-4 hairline">
            <div className="font-mono text-[10px] tracking-widest text-danger">03 · OFFICER DECIDES</div>
            <p className="mt-2 text-xs leading-relaxed text-steel">
              Accept, reject, or switch to an alternative slot — full audit trail attached.
            </p>
          </div>
        </div>

        <Panel title="The problem today">
          <ul className="space-y-2.5 text-sm leading-relaxed text-steel">
            <li>
              <span className="text-cream">Three separate requests, three separate closures.</span> Track, Signal and
              OHE teams each ask for their own possession on the same kilometres.
            </li>
            <li>
              <span className="text-cream">Daytime blocks collide with the timetable.</span> Passenger and freight
              services are delayed or regulated because nobody checked the passing times first.
            </li>
            <li>
              <span className="text-cream">Some corridors starve.</span> Busy sections get their block requests denied
              again and again, so assets keep ageing without attention.
            </li>
          </ul>
        </Panel>
      </section>

      <section className="col-span-12 xl:col-span-5">
        <div className="rise overflow-hidden rounded-lg bg-ink2/80 hairline">
          <div className="flex items-center justify-between border-b border-line bg-ink3/70 px-4 py-2.5">
            <div className="font-mono text-[10px] tracking-[0.2em] text-steel">
              WHAT THE ENGINE DOES · <span className="text-cream">CAPABILITIES</span>
            </div>
            <Tag tone="clear">AI PLANNER</Tag>
          </div>

          <div className="space-y-3 p-4">
            {CAPABILITIES.map((c) => (
              <div key={c.label} className="rounded-md bg-ink3/50 p-3 hairline">
                <div className="flex items-center gap-2">
                  <Lamp tone={c.tone} pulse={false} />
                  <span className="font-mono text-[10px] tracking-widest text-cream">{c.label}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-steel">{c.body}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-line px-4 py-4">
            <div className="mb-3 font-mono text-[10px] tracking-[0.2em] text-steel">
              INTER-DEPARTMENT SAFETY SEQUENCING
            </div>
            <ol className="relative ml-1.5 space-y-4 border-l border-line">
              <li className="relative pl-5">
                <span className="absolute -left-[5px] top-1 size-2.5 rounded-full bg-danger text-danger lamp" />
                <div className="font-mono text-[10px] text-danger">PHASE 1</div>
                <div className="text-sm text-cream">TRD · 25 kV AC OHE power block isolation</div>
              </li>
              <li className="relative pl-5">
                <span className="absolute -left-[5px] top-1 size-2.5 rounded-full bg-signal text-signal lamp" />
                <div className="font-mono text-[10px] text-signal">PHASE 2</div>
                <div className="text-sm text-cream">Engineering · tamping, rail renewal, joint inspection</div>
              </li>
              <li className="relative pl-5">
                <span className="absolute -left-[5px] top-1 size-2.5 rounded-full bg-steel" />
                <div className="font-mono text-[10px] text-steel">PHASE 3</div>
                <div className="text-sm text-cream">S&amp;T · point machine testing &amp; interlocking</div>
              </li>
              <li className="relative pl-5">
                <span className="absolute -left-[5px] top-1 size-2.5 rounded-full bg-clear text-clear" />
                <div className="font-mono text-[10px] text-clear">PHASE 4</div>
                <div className="text-sm text-cream">TRD · re-energize OHE, line handed back</div>
              </li>
            </ol>
          </div>

          <div className="border-t border-line bg-ink/60 px-4 py-3">
            <div className="mb-2 font-mono text-[10px] tracking-[0.2em] text-steel">EXPLORE</div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <Link to="/what-if" className="rounded-md bg-ink3/60 p-2.5 hairline transition hover:bg-ink3">
                <span className="block text-cream">WHAT-IF SIMULATOR</span>
                <span className="mt-1 block text-steel">Test a slot against trains</span>
              </Link>
              <Link to="/plan" className="rounded-md bg-ink3/60 p-2.5 hairline transition hover:bg-ink3">
                <span className="block text-cream">PLAN GENERATOR</span>
                <span className="mt-1 block text-steel">Optimised weekly plan</span>
              </Link>
              <Link to="/risks" className="rounded-md bg-ink3/60 p-2.5 hairline transition hover:bg-ink3">
                <span className="block text-cream">ASSET RISK</span>
                <span className="mt-1 block text-steel">Failure probability</span>
              </Link>
              <Link to="/impact" className="rounded-md bg-ink3/60 p-2.5 hairline transition hover:bg-ink3">
                <span className="block text-cream">IMPACT</span>
                <span className="mt-1 block text-steel">Before vs after AI</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
