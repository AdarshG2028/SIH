/**
 * Turns "this job needs N hours" into an actual set of block sessions.
 *
 * Three cases, decided by how much work there is against how much free
 * track time exists in a night:
 *
 *   - the job fits one window          -> one block, three date options
 *   - it needs a few nights            -> a weekly plan
 *   - it needs many nights             -> a monthly plan
 *
 * Risk overrides the split. Work that cannot safely be left half-finished
 * (a critical asset, a job that must not be opened and closed repeatedly)
 * is never chopped into sessions — it gets one long block and the trains
 * take the delay instead. Breaking a critical job across five nights is
 * more dangerous than delaying a train, so the planner refuses to do it.
 */

export type Cadence = "single" | "weekly" | "monthly" | "continuous";

export interface FreeWindow {
  /** 24h "HH:MM". */
  startTime: string;
  endTime: string;
  hours: number;
  label: string;
  trafficNote: string;
}

export interface BlockSession {
  blockId: string;
  sequence: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
}

export interface PlanOption {
  optionId: string;
  cadence: Cadence;
  /** Headline the officer picks on, e.g. "01:30 AM – 04:30 AM". */
  windowLabel: string;
  startTime: string;
  endTime: string;
  sessionHours: number;
  sessions: BlockSession[];
  totalHours: number;
  /** Why this option looks the way it does. */
  note: string;
  trafficNote: string;
  /** Set when the plan forces train delays instead of splitting. */
  forcesDelay?: boolean;
  /** Set when the block runs past midnight into the next day. */
  spansNextDay?: boolean;
  /** Set when the work needs more nights than a month can hold. */
  overCapacity?: boolean;
}

export interface PlanRequest {
  requestRef: string;
  sectionId: string;
  durationHours: number;
  startDate: string;
  priority: string;
  /** Windows already taken by other blocks — never offered again. */
  occupied?: { date: string; startTime: string }[];
}

export interface PlanResult {
  cadence: Cadence;
  options: PlanOption[];
  /** Plain-language summary of what the planner decided and why. */
  rationale: string;
  nightsNeeded: number;
}

const MIN_SESSION_HOURS = 2;

const pad = (n: number) => String(n).padStart(2, "0");

export const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export const toClock = (minutes: number): string => {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
};

/** "01:30" -> "01:30 AM". Block orders are read in 12h clock. */
export function to12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (h === undefined || m === undefined) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${pad(display)}:${pad(m)} ${suffix}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function weekdayName(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString(undefined, { weekday: "short" });
}

export function prettyDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

/**
 * Candidate windows for a station's night. Derived from the quiet window the
 * station actually works to, widened either side into the shoulder hours that
 * carry less traffic.
 */
export function freeWindowsFor(quiet: { start: string; end: string }): FreeWindow[] {
  const start = toMinutes(quiet.start);
  const end = toMinutes(quiet.end);
  const coreHours = ((end - start + 1440) % 1440) / 60;

  const make = (s: number, e: number, trafficNote: string): FreeWindow => {
    const hours = ((e - s + 1440) % 1440) / 60;
    return {
      startTime: toClock(s),
      endTime: toClock(e),
      hours,
      label: `${to12h(toClock(s))} – ${to12h(toClock(e))}`,
      trafficNote,
    };
  };

  return [
    make(start, end, "Core quiet window — no scheduled passenger traffic"),
    make(start - 60, end, `Quiet window opened one hour early (${coreHours + 1}h)`),
    make(start, end + 90, "Quiet window extended into the early shoulder"),
  ];
}

const isOccupied = (
  occupied: PlanRequest["occupied"],
  date: string,
  startTime: string,
): boolean => Boolean(occupied?.some((o) => o.date === date && o.startTime === startTime));

/**
 * Finds the next date at or after `from` whose window is not already taken.
 * A window in use cannot take another job on top of it, so it is skipped
 * rather than offered and rejected later.
 */
function nextFreeDate(
  from: string,
  startTime: string,
  occupied: PlanRequest["occupied"],
  step = 1,
): string {
  let date = from;
  for (let guard = 0; guard < 120; guard += 1) {
    if (!isOccupied(occupied, date, startTime)) return date;
    date = addDays(date, step);
  }
  return date;
}

/** Work that must not be left half-done between sessions. */
function mustRunContinuous(priority: string, durationHours: number): boolean {
  return priority === "CRITICAL" && durationHours > 8;
}

function buildSessions(
  ref: string,
  startDate: string,
  window: FreeWindow,
  sessionHours: number,
  count: number,
  strideDays: number,
  occupied: PlanRequest["occupied"],
): BlockSession[] {
  const sessions: BlockSession[] = [];
  const taken = [...(occupied ?? [])];
  let cursor = startDate;

  for (let i = 0; i < count; i += 1) {
    const date = nextFreeDate(cursor, window.startTime, taken);
    const startMin = toMinutes(window.startTime);

    sessions.push({
      blockId: `${ref}-B${pad(i + 1)}`,
      sequence: i + 1,
      date,
      startTime: window.startTime,
      endTime: toClock(startMin + sessionHours * 60),
      hours: sessionHours,
    });

    taken.push({ date, startTime: window.startTime });
    cursor = addDays(date, strideDays);
  }

  return sessions;
}

export function planBlocks(req: PlanRequest, windows: FreeWindow[]): PlanResult {
  const { durationHours, startDate, requestRef, priority, occupied } = req;
  const widest = windows.reduce((a, b) => (b.hours > a.hours ? b : a), windows[0]!);

  // Case 1 — the whole job fits inside a single night.
  if (durationHours <= widest.hours) {
    const usable = windows.filter((w) => w.hours >= durationHours);
    const options: PlanOption[] = usable.slice(0, 3).map((w, i) => {
      const date = nextFreeDate(startDate, w.startTime, occupied);
      const startMin = toMinutes(w.startTime);
      const endTime = toClock(startMin + durationHours * 60);

      return {
        optionId: `OPT-${i + 1}`,
        cadence: "single",
        windowLabel: `${to12h(w.startTime)} – ${to12h(endTime)}`,
        startTime: w.startTime,
        endTime,
        sessionHours: durationHours,
        totalHours: durationHours,
        note:
          date === startDate
            ? "Fits in one block on your preferred date"
            : `Nearest free night is ${prettyDate(date)} — your preferred date is already blocked`,
        trafficNote: w.trafficNote,
        sessions: [
          {
            blockId: `${requestRef}-B01`,
            sequence: 1,
            date,
            startTime: w.startTime,
            endTime,
            hours: durationHours,
          },
        ],
      };
    });

    return {
      cadence: "single",
      options,
      rationale: `${durationHours}h of work fits inside one night window, so this stays a single block.`,
      nightsNeeded: 1,
    };
  }

  // Case 2 — too big for one night, and too critical to interrupt.
  if (mustRunContinuous(priority, durationHours)) {
    const options: PlanOption[] = windows.slice(0, 3).map((w, i) => {
      const date = nextFreeDate(startDate, w.startTime, occupied);
      const startMin = toMinutes(w.startTime);
      const endTime = toClock(startMin + durationHours * 60);

      return {
        optionId: `OPT-${i + 1}`,
        cadence: "continuous",
        windowLabel: `${to12h(w.startTime)} – ${to12h(endTime)}`,
        startTime: w.startTime,
        endTime,
        sessionHours: durationHours,
        totalHours: durationHours,
        forcesDelay: true,
        spansNextDay: startMin + durationHours * 60 >= 1440,
        note: `One unbroken ${durationHours}h possession running into the next day. Trains crossing this span will be regulated or diverted.`,
        trafficNote: w.trafficNote,
        sessions: [
          {
            blockId: `${requestRef}-B01`,
            sequence: 1,
            date,
            startTime: w.startTime,
            endTime,
            hours: durationHours,
          },
        ],
      };
    });

    return {
      cadence: "continuous",
      options,
      rationale:
        "This asset is critical and the work cannot be left part-finished between nights, so it is not split. The block runs unbroken and trains absorb the delay.",
      nightsNeeded: 1,
    };
  }

  // Case 3 — split across nights. How many depends on how much fits per night.
  const options: PlanOption[] = [];

  for (const [i, w] of windows.slice(0, 3).entries()) {
    const sessionHours = Math.max(MIN_SESSION_HOURS, Math.min(w.hours, durationHours));
    const count = Math.ceil(durationHours / sessionHours);

    // A week of consecutive nights, or a month that genuinely lands inside a
    // month. The stride is derived from the night count rather than fixed —
    // a fixed 3-day gap pushed a 16-night job seven weeks out.
    const weekly = count <= 7;
    const cadence: Cadence = weekly ? "weekly" : "monthly";
    const strideDays = weekly ? 1 : Math.max(1, Math.min(3, Math.floor(30 / count)));

    // More nights than a month holds. The plan is still produced so the
    // officer can see the size of the job, but it is flagged rather than
    // quietly stretched into next year.
    const overCapacity = count > 30;

    const sessions = buildSessions(
      requestRef,
      startDate,
      w,
      sessionHours,
      count,
      strideDays,
      occupied,
    );

    const last = sessions[sessions.length - 1];

    options.push({
      optionId: `OPT-${i + 1}`,
      cadence,
      windowLabel: `${to12h(w.startTime)} – ${to12h(toClock(toMinutes(w.startTime) + sessionHours * 60))}`,
      startTime: w.startTime,
      endTime: toClock(toMinutes(w.startTime) + sessionHours * 60),
      sessionHours,
      totalHours: durationHours,
      ...(overCapacity ? { overCapacity: true } : {}),
      note: overCapacity
        ? `${count} nights of ${sessionHours}h needed — more than a month of night windows. Finishing ${prettyDate(last!.date)}.`
        : weekly
          ? `${count} nights of ${sessionHours}h, running ${prettyDate(sessions[0]!.date)} to ${prettyDate(last!.date)}`
          : `${count} sessions of ${sessionHours}h spread over ${prettyDate(sessions[0]!.date)} to ${prettyDate(last!.date)}`,
      trafficNote: w.trafficNote,
      sessions,
    });
  }

  const nightsNeeded = options[0]?.sessions.length ?? 1;
  const cadence: Cadence = options[0]?.cadence ?? "weekly";

  const over = options[0]?.overCapacity ?? false;

  return {
    cadence,
    options,
    rationale: over
      ? `${durationHours}h of work needs ${nightsNeeded} night sessions, which is more than a month of windows on this section. Either raise the hours per night, or split this into separate requests per km stretch.`
      : cadence === "weekly"
        ? `${durationHours}h will not fit in one night, so it is split across ${nightsNeeded} consecutive nights in the same window. You only choose the window — the AI lays out the nights.`
        : `${durationHours}h needs ${nightsNeeded} sessions across the month. You only choose the window — the AI lays out the dates.`,
    nightsNeeded,
  };
}
