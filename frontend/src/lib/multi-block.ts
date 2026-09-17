/**
 * Multi-Block Task Decomposition Engine
 * Handles long duration maintenance jobs (e.g. 12 hours) that cannot be completed
 * in a single track possession without blocking passenger traffic.
 * Automatically decomposes total duration into N quiet night possession windows.
 */

export interface SplitBlock {
  sequenceNumber: number;
  totalBlocks: number;
  date: string;
  dayOffset: number;
  startTime: string;
  endTime: string;
  durationHours: number;
  label: string;
  focusWork: string;
}

export interface DecompositionResult {
  totalHours: number;
  maxSingleBlockHours: number;
  blocksRequired: number;
  startDate: string;
  completionDate: string;
  schedule: SplitBlock[];
  operationalNotice: string;
}

export function decomposeLongTask(
  totalHours: number,
  maxSingleBlockHours: number = 3.0,
  startDateStr: string = "2026-09-17",
  startTime: string = "01:30",
  taskDescription: string = "Heavy Track Relaying"
): DecompositionResult {
  const cleanTotal = Math.max(1, totalHours);
  const cleanMax = Math.max(1, maxSingleBlockHours);
  const blocksRequired = Math.ceil(cleanTotal / cleanMax);

  const schedule: SplitBlock[] = [];
  const baseDate = new Date(startDateStr);

  let remainingHours = cleanTotal;

  for (let i = 0; i < blocksRequired; i++) {
    const currentDuration = Math.min(cleanMax, remainingHours);
    remainingHours -= currentDuration;

    const blockDate = new Date(baseDate);
    blockDate.setDate(baseDate.getDate() + i);

    // Calculate end time
    const [startH, startM] = startTime.split(":").map(Number);
    const endMinutesTotal = startH * 60 + startM + Math.round(currentDuration * 60);
    const endH = Math.floor(endMinutesTotal / 60) % 24;
    const endM = endMinutesTotal % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const dateFormatted = blockDate.toISOString().split("T")[0];

    schedule.push({
      sequenceNumber: i + 1,
      totalBlocks: blocksRequired,
      date: dateFormatted,
      dayOffset: i,
      startTime,
      endTime,
      durationHours: currentDuration,
      label: `Night ${i + 1} of ${blocksRequired}: ${startTime} – ${endTime} (${currentDuration}h)`,
      focusWork:
        blocksRequired === 1
          ? `Full execution: ${taskDescription}`
          : i === 0
            ? `Phase 1: Mobilization, track dismantling & ballast scarifying`
            : i === blocksRequired - 1
              ? `Phase ${i + 1}: Final alignment, tamping & safety speed clearance`
              : `Phase ${i + 1}: Continuous progressive mechanized execution`,
    });
  }

  const completionDate = schedule[schedule.length - 1].date;

  return {
    totalHours: cleanTotal,
    maxSingleBlockHours: cleanMax,
    blocksRequired,
    startDate: startDateStr,
    completionDate,
    schedule,
    operationalNotice: `Task duration of ${cleanTotal}h automatically partitioned into ${blocksRequired} staggered overnight quiet possessions to ensure 0 daytime passenger train cancellations.`,
  };
}
