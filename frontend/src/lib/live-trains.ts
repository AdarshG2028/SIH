/**
 * Live train telemetry, scoped to a station.
 *
 * A station master only cares about trains that actually pass through their
 * own station — a delay three divisions away changes nothing about whether
 * they can hold a block tonight. So telemetry is keyed by station code and
 * never mixed across stations.
 */

export interface LiveTrain {
  number: string;
  name: string;
  type: "Superfast" | "Express" | "Commuter Local" | "Freight" | "Mail";
  scheduledPassage: string;
  liveDelayMinutes: number;
  effectivePassage: string;
  status: string;
  priority: "VIP" | "HIGH" | "COMMUTER" | "GOODS" | "NORMAL";
}

/** Adds `delay` minutes to a "hh:mm AM/PM" passage time. */
function shiftTime(passage: string, delay: number): string {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(passage.trim());
  if (!match) return passage;

  const rawHour = match[1] ?? "0";
  const rawMinute = match[2] ?? "0";
  const meridiem = (match[3] ?? "AM").toUpperCase();

  let hour = Number(rawHour) % 12;
  if (meridiem === "PM") hour += 12;

  const total = (hour * 60 + Number(rawMinute) + delay + 1440) % 1440;
  const outHour = Math.floor(total / 60);
  const outMinute = total % 60;
  const suffix = outHour >= 12 ? "PM" : "AM";
  const display = outHour % 12 === 0 ? 12 : outHour % 12;

  return `${String(display).padStart(2, "0")}:${String(outMinute).padStart(2, "0")} ${suffix}`;
}

type TrainSeed = Omit<LiveTrain, "effectivePassage" | "status"> & { status?: string };

function build(seeds: TrainSeed[]): LiveTrain[] {
  return seeds.map((seed) => ({
    ...seed,
    effectivePassage: shiftTime(seed.scheduledPassage, seed.liveDelayMinutes),
    status:
      seed.status ??
      (seed.liveDelayMinutes > 15
        ? "Delayed"
        : seed.liveDelayMinutes > 0
          ? "Running Late"
          : "On Time"),
  }));
}

const BY_STATION: Record<string, LiveTrain[]> = {
  LNL: build([
    {
      number: "11007",
      name: "Deccan Express",
      type: "Express",
      scheduledPassage: "10:45 AM",
      liveDelayMinutes: 35,
      priority: "HIGH",
    },
    {
      number: "99815",
      name: "Lonavala – Pune Suburban",
      type: "Commuter Local",
      scheduledPassage: "11:15 AM",
      liveDelayMinutes: 0,
      priority: "COMMUTER",
    },
    {
      number: "12123",
      name: "Deccan Queen Superfast",
      type: "Superfast",
      scheduledPassage: "07:15 PM",
      liveDelayMinutes: 5,
      priority: "VIP",
    },
    {
      number: "BOXN-842",
      name: "Heavy Coal Freight (58 Wagons)",
      type: "Freight",
      scheduledPassage: "02:15 AM",
      liveDelayMinutes: 0,
      status: "Regulated in Siding",
      priority: "GOODS",
    },
  ]),
  PUNE: build([
    {
      number: "12127",
      name: "Pune – Mumbai Intercity",
      type: "Superfast",
      scheduledPassage: "06:10 AM",
      liveDelayMinutes: 0,
      priority: "VIP",
    },
    {
      number: "11009",
      name: "Sinhagad Express",
      type: "Express",
      scheduledPassage: "09:40 AM",
      liveDelayMinutes: 18,
      priority: "HIGH",
    },
    {
      number: "99801",
      name: "Pune – Lonavala Local",
      type: "Commuter Local",
      scheduledPassage: "12:05 PM",
      liveDelayMinutes: 4,
      priority: "COMMUTER",
    },
    {
      number: "BCNA-215",
      name: "Cement Rake (42 Wagons)",
      type: "Freight",
      scheduledPassage: "01:50 AM",
      liveDelayMinutes: 0,
      status: "Regulated in Siding",
      priority: "GOODS",
    },
  ]),
  CSMT: build([
    {
      number: "12009",
      name: "Shatabdi Express",
      type: "Superfast",
      scheduledPassage: "06:25 AM",
      liveDelayMinutes: 0,
      priority: "VIP",
    },
    {
      number: "96501",
      name: "CSMT – Kalyan Fast Local",
      type: "Commuter Local",
      scheduledPassage: "08:52 AM",
      liveDelayMinutes: 12,
      priority: "COMMUTER",
    },
    {
      number: "11013",
      name: "Coimbatore Express",
      type: "Express",
      scheduledPassage: "03:30 PM",
      liveDelayMinutes: 42,
      priority: "HIGH",
    },
  ]),
  KYN: build([
    {
      number: "96512",
      name: "Kalyan – CSMT Slow Local",
      type: "Commuter Local",
      scheduledPassage: "07:18 AM",
      liveDelayMinutes: 8,
      priority: "COMMUTER",
    },
    {
      number: "12137",
      name: "Punjab Mail",
      type: "Mail",
      scheduledPassage: "11:55 AM",
      liveDelayMinutes: 25,
      priority: "HIGH",
    },
    {
      number: "BOXN-119",
      name: "Iron Ore Rake (59 Wagons)",
      type: "Freight",
      scheduledPassage: "02:40 AM",
      liveDelayMinutes: 0,
      status: "Regulated in Siding",
      priority: "GOODS",
    },
  ]),
  NDLS: build([
    {
      number: "12001",
      name: "Bhopal Shatabdi",
      type: "Superfast",
      scheduledPassage: "06:00 AM",
      liveDelayMinutes: 0,
      priority: "VIP",
    },
    {
      number: "12951",
      name: "Mumbai Rajdhani",
      type: "Superfast",
      scheduledPassage: "04:55 PM",
      liveDelayMinutes: 0,
      priority: "VIP",
    },
    {
      number: "14205",
      name: "Ayodhya Express",
      type: "Express",
      scheduledPassage: "10:20 PM",
      liveDelayMinutes: 55,
      priority: "HIGH",
    },
  ]),
};

/**
 * Fallback for stations without a hand-written rake list. Derived from the
 * station code so the same station always shows the same trains instead of
 * reshuffling on every render.
 */
function fallbackFor(stationCode: string): LiveTrain[] {
  const seed = [...stationCode].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  return build([
    {
      number: String(12000 + (seed % 800)),
      name: `${stationCode} Intercity Express`,
      type: "Express",
      scheduledPassage: "09:25 AM",
      liveDelayMinutes: seed % 3 === 0 ? 22 : 0,
      priority: "HIGH",
    },
    {
      number: String(56000 + (seed % 400)),
      name: `${stationCode} Passenger`,
      type: "Commuter Local",
      scheduledPassage: "01:40 PM",
      liveDelayMinutes: seed % 4 === 0 ? 9 : 0,
      priority: "COMMUTER",
    },
    {
      number: `BOXN-${300 + (seed % 90)}`,
      name: "Goods Rake (54 Wagons)",
      type: "Freight",
      scheduledPassage: "02:05 AM",
      liveDelayMinutes: 0,
      status: "Regulated in Siding",
      priority: "GOODS",
    },
  ]);
}

/** Trains passing through this station only. */
export function getLiveTrains(stationCode: string): LiveTrain[] {
  return BY_STATION[stationCode] ?? fallbackFor(stationCode);
}
