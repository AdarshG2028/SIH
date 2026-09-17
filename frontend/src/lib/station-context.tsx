import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { STATIONS, getStation, DEFAULT_STATION_CODE, type Station } from "./stations";
import type { BlockSession, Cadence } from "./block-plan";

export interface StationTask {
  id: string;
  title: string;
  department: "Engineering" | "Signal & Telecommunication (S&T)" | "Traction Distribution (TRD)";
  sectionId: string;
  stationCode: string;
  fromKm: number;
  toKm: number;
  durationHours: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "pending" | "scheduled" | "conflict_disrupted" | "completed";
  completedAt?: string;
  maintenanceType?: string;
  /**
   * Every block that will be held to finish this job. A short job has one;
   * a job split across a week or a month has many. The dashboard shows all
   * of them so the officer sees the full commitment, not just the first night.
   */
  sessions?: BlockSession[];
  cadence?: Cadence;
  notes?: string;
  scheduledWindow?: {
    date: string;
    startTime: string;
    endTime: string;
  };
  disruption?: {
    trainNumber: string;
    trainName: string;
    liveDelayMinutes: number;
    scheduledPassage: string;
    reason: string;
  };
  alternativeSlots?: {
    slotId: string;
    date: string;
    startTime: string;
    endTime: string;
    label: string;
    note: string;
  }[];
}

export interface EmailAlert {
  id: string;
  timestamp: string;
  toEmail: string;
  sender: string;
  subject: string;
  type: "DELAY_DISRUPTION" | "RESCHEDULE_CONFIRMED" | "BLOCK_SCHEDULED";
  taskId: string;
  taskTitle: string;
  conflictingTrain?: string;
  delayMinutes?: number;
  disruptedWindow?: string;
  resolvedWindow?: string;
  alternativeSlots?: {
    slotId: string;
    date: string;
    startTime: string;
    endTime: string;
    label: string;
    note: string;
  }[];
  isRead: boolean;
}

export interface UserProfile {
  name: string;
  designation: string;
  department: "Engineering" | "Signal & Telecommunication (S&T)" | "Traction Distribution (TRD)";
  email: string;
  phone: string;
}

interface StationContextType {
  activeStation: Station;
  setStationCode: (code: string) => void;
  userProfile: UserProfile;
  updateUserEmail: (email: string) => void;
  tasks: StationTask[];
  scheduleWithAI: (taskId: string) => Promise<void>;
  rescheduleTask: (taskId: string, slotId: string) => void;
  completeTask: (taskId: string) => void;
  addPlannedTask: (task: StationTask) => void;
  simulateLiveTrainDisruption: (taskId: string) => void;
  notifications: EmailAlert[];
  unreadCount: number;
  markAsRead: (alertId: string) => void;
  isInboxOpen: boolean;
  setIsInboxOpen: (open: boolean) => void;
}

const StationContext = createContext<StationContextType | undefined>(undefined);

/** Local date as YYYY-MM-DD, matching the format the demo tasks use. */
export function todayISO(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * A task is overdue when its planned date has already gone past and nobody
 * marked it complete. These are the ones that quietly rot in a decentralised
 * process, so the workbench floats them to the top.
 */
export function isOverdue(task: StationTask, today = todayISO()): boolean {
  if (task.status === "completed") return false;
  const planned = task.scheduledWindow?.date;
  return Boolean(planned && planned < today);
}

const INITIAL_TASKS: StationTask[] = [
  {
    id: "TSK-LNL-01",
    title: "Deep Screening & Ballast Tamping Up-Line",
    department: "Engineering",
    sectionId: "LNL-PUNE",
    stationCode: "LNL",
    fromKm: 45.2,
    toKm: 48.6,
    durationHours: 3.0,
    priority: "HIGH",
    status: "scheduled",
    scheduledWindow: {
      date: "2026-09-16",
      startTime: "10:30",
      endTime: "13:30",
    },
    alternativeSlots: [
      {
        slotId: "ALT-1",
        date: "2026-09-17",
        startTime: "01:30",
        endTime: "04:30",
        label: "Tomorrow Night (01:30 AM – 04:30 AM)",
        note: "0 Passenger & 0 Goods train conflicts. Optimal quiet window.",
      },
      {
        slotId: "ALT-2",
        date: "2026-09-17",
        startTime: "02:00",
        endTime: "05:00",
        label: "Tomorrow Night (02:00 AM – 05:00 AM)",
        note: "Clean slot before morning Mumbai local departure.",
      },
    ],
  },
  {
    id: "TSK-LNL-02",
    title: "Point Machine & Digital Axle Counter Overhaul",
    department: "Signal & Telecommunication (S&T)",
    sectionId: "LNL-PUNE",
    stationCode: "LNL",
    fromKm: 46.0,
    toKm: 46.8,
    durationHours: 2.0,
    priority: "CRITICAL",
    status: "pending",
  },
  {
    id: "TSK-LNL-03",
    title: "25 kV AC Catenary Contact Wire Stagger Inspection",
    department: "Traction Distribution (TRD)",
    sectionId: "LNL-PUNE",
    stationCode: "LNL",
    fromKm: 45.0,
    toKm: 52.0,
    durationHours: 2.5,
    priority: "MEDIUM",
    status: "pending",
  },
  {
    id: "TSK-LNL-04",
    title: "Ultrasonic Flaw Detection (USFD) Rail Head Testing",
    department: "Engineering",
    sectionId: "LNL-PUNE",
    stationCode: "LNL",
    fromKm: 50.1,
    toKm: 54.0,
    durationHours: 3.0,
    priority: "HIGH",
    status: "pending",
  },
];

export function StationProvider({ children }: { children: ReactNode }) {
  const [stationCode, setStationCodeState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("active_station_code") || DEFAULT_STATION_CODE;
    }
    return DEFAULT_STATION_CODE;
  });

  const [activeStation, setActiveStation] = useState<Station>(() => getStation(stationCode));

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const savedEmail =
      typeof window !== "undefined"
        ? localStorage.getItem("user_email") || "sse.pway.lonavala@cr.railnet.gov.in"
        : "sse.pway.lonavala@cr.railnet.gov.in";
    return {
      name: "Er. Ramesh Kumar",
      designation: "Senior Section Engineer (P-Way)",
      department: "Engineering",
      email: savedEmail,
      phone: "+91 94220 18452",
    };
  });

  const [tasks, setTasks] = useState<StationTask[]>(INITIAL_TASKS);
  const [notifications, setNotifications] = useState<EmailAlert[]>([
    {
      id: "EML-INIT-01",
      timestamp: "Just now",
      toEmail: userProfile.email,
      sender: "AI Rail Planning Control <ai-planner@cr.railnet.gov.in>",
      subject: "Welcome to Indian Railways AI Autonomous Block Planner",
      type: "BLOCK_SCHEDULED",
      taskId: "TSK-LNL-01",
      taskTitle: "Deep Screening & Ballast Tamping Up-Line",
      isRead: true,
      resolvedWindow: "10:30 AM – 01:30 PM (Scheduled)",
    },
  ]);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  const setStationCode = (code: string) => {
    setStationCodeState(code);
    const station = getStation(code);
    setActiveStation(station);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_station_code", code);
    }
    // Update user title & section to match chosen station
    setUserProfile((prev) => ({
      ...prev,
      designation: `Senior Section Engineer (${station.code} Station)`,
      email: `sse.pway.${station.code.toLowerCase()}@${station.zone.slice(0, 2).toLowerCase()}.railnet.gov.in`,
    }));
  };

  const updateUserEmail = (email: string) => {
    setUserProfile((prev) => ({ ...prev, email }));
    if (typeof window !== "undefined") {
      localStorage.setItem("user_email", email);
    }
  };

  const markAsRead = (alertId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === alertId ? { ...n, isRead: true } : n)),
    );
  };

  // Internal invisible AI scheduling
  const scheduleWithAI = async (taskId: string) => {
    // Artificial AI calculation delay (800ms) to feel realistic
    await new Promise((r) => setTimeout(r, 800));

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const quiet = activeStation.quietWindow;
        return {
          ...t,
          status: "scheduled",
          scheduledWindow: {
            date: "2026-09-17",
            startTime: quiet.start,
            endTime: quiet.end,
          },
          alternativeSlots: [
            {
              slotId: "ALT-AUTO-1",
              date: "2026-09-17",
              startTime: quiet.start,
              endTime: quiet.end,
              label: `${quiet.label} (Tomorrow)`,
              note: "Zero traffic conflict. Recommended by AI optimizer.",
            },
            {
              slotId: "ALT-AUTO-2",
              date: "2026-09-18",
              startTime: quiet.start,
              endTime: quiet.end,
              label: `${quiet.label} (Day after)`,
              note: "Backup quiet window with matching resource availability.",
            },
          ],
        };
      }),
    );

    // Send confirmation email
    const task = tasks.find((t) => t.id === taskId);
    const alert: EmailAlert = {
      id: `EML-${Date.now()}`,
      timestamp: "Just now",
      toEmail: userProfile.email,
      sender: "AI Rail Planning Control <ai-planner@cr.railnet.gov.in>",
      subject: `[CONFIRMED] AI Scheduled Block for ${task?.title ?? "Task"}`,
      type: "BLOCK_SCHEDULED",
      taskId: taskId,
      taskTitle: task?.title ?? "Maintenance Task",
      resolvedWindow: `${activeStation.quietWindow.label} on 17/09/2026`,
      isRead: false,
    };
    setNotifications((prev) => [alert, ...prev]);
  };

  // Trigger simulated disruption from live train delay (+35 min)
  const simulateLiveTrainDisruption = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const trainDisruption = {
      trainNumber: "11007",
      trainName: "Deccan Express",
      liveDelayMinutes: 35,
      scheduledPassage: "10:45",
      reason: "Upstream caution order & freight congestion between Karjat & Khandala",
    };

    const alternatives = [
      {
        slotId: "ALT-DIS-1",
        date: "2026-09-17",
        startTime: "01:30",
        endTime: "04:30",
        label: "Tomorrow Night: 01:30 AM – 04:30 AM",
        note: "Zero passenger trains scheduled. Complete catenary isolation granted.",
      },
      {
        slotId: "ALT-DIS-2",
        date: "2026-09-17",
        startTime: "15:00",
        endTime: "18:00",
        label: "Tomorrow Afternoon: 03:00 PM – 06:00 PM",
        note: "Post-peak slot between commuter locals. Goods trains stabled in siding.",
      },
    ];

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: "conflict_disrupted",
          disruption: trainDisruption,
          alternativeSlots: alternatives,
        };
      }),
    );

    // Dispatch Urgent Email Alert to the user
    const emailAlert: EmailAlert = {
      id: `EML-ALERT-${Date.now()}`,
      timestamp: "Just now",
      toEmail: userProfile.email,
      sender: "CRIS RTIS Telemetry Alert <alerts@cris.railnet.gov.in>",
      subject: `⚠️ URGENT: Block Window Disrupted by Train #${trainDisruption.trainNumber} (${trainDisruption.trainName} +${trainDisruption.liveDelayMinutes}m) — Action Required`,
      type: "DELAY_DISRUPTION",
      taskId: taskId,
      taskTitle: task.title,
      conflictingTrain: `${trainDisruption.trainName} (#${trainDisruption.trainNumber})`,
      delayMinutes: trainDisruption.liveDelayMinutes,
      disruptedWindow: task.scheduledWindow
        ? `${task.scheduledWindow.startTime} – ${task.scheduledWindow.endTime}`
        : "Current scheduled time",
      alternativeSlots: alternatives,
      isRead: false,
    };

    setNotifications((prev) => [emailAlert, ...prev]);
    setIsInboxOpen(true); // Open inbox so user immediately sees the email dispatch!
  };

  // One-click reschedule confirmation from email or dashboard
  const rescheduleTask = (taskId: string, slotId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.alternativeSlots) return;

    const chosenSlot = task.alternativeSlots.find((s) => s.slotId === slotId);
    if (!chosenSlot) return;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const { disruption: _cleared, ...rest } = t;
        return {
          ...rest,
          status: "scheduled",
          scheduledWindow: {
            date: chosenSlot.date,
            startTime: chosenSlot.startTime,
            endTime: chosenSlot.endTime,
          },
          // The slot is now occupied by this task, so it stops being an
          // alternative. Without this the picker keeps re-offering the very
          // window the user just accepted.
          alternativeSlots: (t.alternativeSlots ?? []).filter((s) => s.slotId !== slotId),
        };
      }),
    );

    // Same reason on the email side: a dispatched alert must not keep
    // advertising a slot that has already been taken.
    setNotifications((prev) =>
      prev.map((alert) =>
        alert.taskId === taskId && alert.alternativeSlots
          ? {
              ...alert,
              alternativeSlots: alert.alternativeSlots.filter((s) => s.slotId !== slotId),
            }
          : alert,
      ),
    );

    // Issue confirmation email
    const confirmAlert: EmailAlert = {
      id: `EML-CONFIRM-${Date.now()}`,
      timestamp: "Just now",
      toEmail: userProfile.email,
      sender: "AI Rail Planning Control <ai-planner@cr.railnet.gov.in>",
      subject: `✅ [RESCHEDULED] Maintenance Block Confirmed for ${chosenSlot.label}`,
      type: "RESCHEDULE_CONFIRMED",
      taskId: taskId,
      taskTitle: task.title,
      resolvedWindow: `${chosenSlot.label} (${chosenSlot.date})`,
      isRead: false,
    };

    setNotifications((prev) => [confirmAlert, ...prev]);
  };

  // Marking work done is what takes a task off the workbench. The record is
  // kept (status flips to "completed") rather than deleted, so the station
  // still has a maintenance history.
  const completeTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const { disruption: _cleared, ...rest } = t;
        return { ...rest, status: "completed" as const, completedAt: todayISO() };
      }),
    );
  };

  /** Accepts a planned request and puts it on the workbench straight away. */
  const addPlannedTask = (task: StationTask) => {
    setTasks((prev) => [task, ...prev]);

    const first = task.sessions?.[0];
    const blocks = task.sessions?.length ?? 1;

    setNotifications((prev) => [
      {
        id: `EML-PLAN-${Date.now()}`,
        timestamp: "Just now",
        toEmail: userProfile.email,
        sender: "AI Rail Planning Control <ai-planner@cr.railnet.gov.in>",
        subject: `[SCHEDULED] ${task.title} — ${blocks} block${blocks > 1 ? "s" : ""} allotted`,
        type: "BLOCK_SCHEDULED",
        taskId: task.id,
        taskTitle: task.title,
        ...(first ? { resolvedWindow: `${first.date} ${first.startTime}–${first.endTime}` } : {}),
        isRead: false,
      },
      ...prev,
    ]);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <StationContext.Provider
      value={{
        activeStation,
        setStationCode,
        userProfile,
        updateUserEmail,
        tasks,
        scheduleWithAI,
        rescheduleTask,
        completeTask,
        addPlannedTask,
        simulateLiveTrainDisruption,
        notifications,
        unreadCount,
        markAsRead,
        isInboxOpen,
        setIsInboxOpen,
      }}
    >
      {children}
    </StationContext.Provider>
  );
}

export function useStation() {
  const context = useContext(StationContext);
  if (!context) {
    throw new Error("useStation must be used within a StationProvider");
  }
  return context;
}
