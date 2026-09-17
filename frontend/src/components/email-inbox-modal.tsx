import { useState } from "react";
import { useStation, type EmailAlert } from "@/lib/station-context";
import { ChromeButton, GhostButton, Tag, Lamp } from "@/components/control";
import { Mail, Clock, AlertTriangle, CheckCircle2, Shield, ArrowRight, X, Edit2, Send } from "lucide-react";

export function EmailInboxModal() {
  const {
    isInboxOpen,
    setIsInboxOpen,
    notifications,
    userProfile,
    updateUserEmail,
    markAsRead,
    rescheduleTask,
    unreadCount,
  } = useStation();

  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(() =>
    notifications.length > 0 ? notifications[0].id : null,
  );
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(userProfile.email);
  const [rescheduleSuccess, setRescheduleSuccess] = useState<string | null>(null);

  if (!isInboxOpen) return null;

  const activeAlert = notifications.find((n) => n.id === selectedAlertId) || notifications[0];

  const handleSelectEmail = (alert: EmailAlert) => {
    setSelectedAlertId(alert.id);
    markAsRead(alert.id);
    setRescheduleSuccess(null);
  };

  const handleSaveEmail = () => {
    if (emailInput.trim()) {
      updateUserEmail(emailInput.trim());
      setIsEditingEmail(false);
    }
  };

  const handleConfirmReschedule = (taskId: string, slotId: string, slotLabel: string) => {
    rescheduleTask(taskId, slotId);
    setRescheduleSuccess(`Maintenance task rescheduled to ${slotLabel}. Master dispatch updated!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-line bg-ink2 shadow-2xl overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-line bg-ink px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-signal/20 text-signal">
              <Mail className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-semibold tracking-wide text-cream">
                  Section Engineer Official Dispatch Mailbox
                </span>
                {unreadCount > 0 && (
                  <Tag tone="danger">{unreadCount} New</Tag>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-steel">
                <span>Account:</span>
                {isEditingEmail ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="rounded border border-line bg-ink px-2 py-0.5 font-mono text-xs text-cream outline-none focus:border-signal"
                    />
                    <button
                      onClick={handleSaveEmail}
                      className="rounded bg-signal px-2 py-0.5 text-xs text-ink font-semibold"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingEmail(false)}
                      className="text-xs text-steel hover:text-cream px-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-signal">{userProfile.email}</span>
                    <button
                      onClick={() => {
                        setEmailInput(userProfile.email);
                        setIsEditingEmail(true);
                      }}
                      className="text-steel hover:text-cream transition"
                      title="Change user email"
                    >
                      <Edit2 className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsInboxOpen(false)}
            className="rounded-lg p-2 text-steel hover:bg-ink3 hover:text-cream transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Mailbox Body: Split View (List on left, detail on right) */}
        <div className="grid flex-1 grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Email List */}
          <div className="border-r border-line bg-ink3/30 md:col-span-4 overflow-y-auto">
            <div className="p-3 border-b border-line/60">
              <span className="label-mono">Incoming Railway AI Dispatches</span>
            </div>
            {notifications.length === 0 ? (
              <div className="p-6 text-center font-mono text-xs text-steel">
                Inbox is clear. No alerts dispatched.
              </div>
            ) : (
              <div className="divide-y divide-line/40">
                {notifications.map((n) => {
                  const isSelected = n.id === activeAlert?.id;
                  const isDelay = n.type === "DELAY_DISRUPTION";
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleSelectEmail(n)}
                      className={`w-full p-4 text-left transition flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-signal/10 border-l-2 border-l-signal"
                          : "hover:bg-ink3/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {!n.isRead && (
                            <span className="size-2 rounded-full bg-signal animate-pulse" />
                          )}
                          <span
                            className={`font-mono text-[10px] uppercase font-semibold ${
                              isDelay ? "text-danger" : "text-clear"
                            }`}
                          >
                            {isDelay ? "URGENT ALERT" : "SYSTEM NOTICE"}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-steel">{n.timestamp}</span>
                      </div>
                      <div className="font-display text-sm font-medium leading-snug text-cream line-clamp-1">
                        {n.subject}
                      </div>
                      <div className="font-mono text-[11px] text-steel line-clamp-1">
                        Task: {n.taskTitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Email Reading View */}
          <div className="flex flex-col md:col-span-8 overflow-y-auto p-6 bg-ink2">
            {activeAlert ? (
              <div className="space-y-6">
                {/* Email Header */}
                <div className="rounded-lg border border-line bg-ink p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-lg font-semibold uppercase text-cream">
                        {activeAlert.subject}
                      </h2>
                      <div className="mt-2 space-y-1 font-mono text-xs text-steel">
                        <div>
                          <span className="text-steel/70">From:</span> {activeAlert.sender}
                        </div>
                        <div>
                          <span className="text-steel/70">To:</span> {activeAlert.toEmail}
                        </div>
                        <div>
                          <span className="text-steel/70">Time:</span> {activeAlert.timestamp}
                        </div>
                      </div>
                    </div>
                    <Tag tone={activeAlert.type === "DELAY_DISRUPTION" ? "danger" : "clear"}>
                      {activeAlert.type === "DELAY_DISRUPTION" ? "Action Required" : "Informational"}
                    </Tag>
                  </div>
                </div>

                {/* Delay Disruption Body */}
                {activeAlert.type === "DELAY_DISRUPTION" ? (
                  <div className="space-y-5">
                    {/* Conflict Explanation Card */}
                    <div className="rounded-lg border border-danger/40 bg-danger/10 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="size-5 shrink-0 text-danger mt-0.5" />
                        <div className="space-y-1.5">
                          <h3 className="font-display text-sm uppercase tracking-wide text-danger font-semibold">
                            Live Train Delay Causing Block Collision
                          </h3>
                          <p className="text-xs text-cream/90 leading-relaxed">
                            Telemetry indicates that{" "}
                            <span className="font-semibold text-danger">
                              {activeAlert.conflictingTrain}
                            </span>{" "}
                            is currently running{" "}
                            <span className="font-bold underline text-danger">
                              +{activeAlert.delayMinutes} minutes late
                            </span>{" "}
                            due to upstream regulation. Its revised passage time overlaps with your
                            scheduled maintenance block window (
                            <span className="font-mono text-cream">
                              {activeAlert.disruptedWindow}
                            </span>
                            ).
                          </p>
                          <div className="font-mono text-[11px] text-steel pt-1">
                            Operational Directive: The line cannot be closed at the original time
                            without detaining passenger express traffic. AI has recomputed conflict-free
                            alternate slots below.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reschedule Success Alert */}
                    {rescheduleSuccess && (
                      <div className="rounded-lg border border-clear/40 bg-clear/15 p-4 flex items-center gap-3">
                        <CheckCircle2 className="size-5 text-clear shrink-0" />
                        <span className="font-mono text-xs text-clear font-semibold">
                          {rescheduleSuccess}
                        </span>
                      </div>
                    )}

                    {/* Alternative Timings Picker */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="label-mono text-cream">
                          AI-Calculated Clean Alternative Timings:
                        </span>
                        <span className="font-mono text-[10px] text-steel">
                          100% Zero Passenger Conflicts
                        </span>
                      </div>

                      <div className="grid gap-3">
                        {activeAlert.alternativeSlots?.map((slot, idx) => (
                          <div
                            key={slot.slotId}
                            className="rounded-lg border border-line bg-ink p-4 transition hover:border-signal/70"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-display text-base font-semibold text-cream">
                                    {slot.label}
                                  </span>
                                  <Tag tone={idx === 0 ? "clear" : "steel"}>
                                    {idx === 0 ? "AI Recommended" : "Backup Slot"}
                                  </Tag>
                                </div>
                                <p className="text-xs text-steel">{slot.note}</p>
                              </div>
                              <ChromeButton
                                onClick={() =>
                                  handleConfirmReschedule(activeAlert.taskId, slot.slotId, slot.label)
                                }
                                className="shrink-0 text-xs px-4 py-2 font-display uppercase tracking-wider"
                              >
                                Select This Timing
                              </ChromeButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard / Confirmed Email Body */
                  <div className="space-y-4">
                    <div className="rounded-lg border border-clear/30 bg-clear/10 p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="size-5 text-clear shrink-0" />
                        <div>
                          <div className="font-display text-sm font-semibold uppercase text-clear">
                            {activeAlert.taskTitle}
                          </div>
                          <div className="font-mono text-xs text-cream mt-0.5">
                            Confirmed Window: {activeAlert.resolvedWindow}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-line bg-ink p-4 space-y-2 text-xs leading-relaxed text-steel font-mono">
                      <p>
                        The Indian Railways Autonomous Block Planner has registered and synchronized this
                        possession request across Engineering (P-Way), Signal & Telecommunication (S&T),
                        and TRD (OHE Electrical).
                      </p>
                      <p>
                        Status: Integrated into Divisional Master Shadow Block Schedule.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="m-auto text-center font-mono text-xs text-steel">
                Select a message from the left to read.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
