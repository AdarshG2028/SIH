#!/usr/bin/env python3
"""
Railway Maintenance Block Request Handler

Parses, validates, and enriches user-submitted maintenance block requests
from the BDMS-style frontend interface.

Key Principle:
- Time (duration, start/end time), number of workers, and machines/equipment
  required are NOT hardcoded by default; they are EXPLICITLY PROVIDED BY THE USER.
- The system validates their feasibility, enriches the request with railway
  safety regulations and department associations, and prepares it for multi-department
  co-location planning.
"""

import re
from datetime import datetime
from typing import Dict, Any, Optional, List


# =============================================================================
# RAILWAY SAFETY & OPERATING PROTOCOLS
# =============================================================================

ACTIVITY_SAFETY_PROFILES = {
    "track": {
        "department": "Engineering",
        "speed_restriction": "30 km/h caution order for 24h post-work",
        "safety_precautions": (
            "Banner flags and detonators placed at 600m & 1200m; "
            "engineering lookout protection active; track circuit insulation intact."
        ),
        "power_block_required": False,
        "traffic_block_required": True,
    },
    "tamping": {
        "department": "Engineering",
        "speed_restriction": "30 km/h caution order for 24h post-tamping",
        "safety_precautions": (
            "Track tamping machine safe-running corridor cleared; "
            "SEJ (Switch Expansion Joint) and ballast clearances confirmed."
        ),
        "power_block_required": False,
        "traffic_block_required": True,
    },
    "rail_renewal": {
        "department": "Engineering",
        "speed_restriction": "20 km/h caution order",
        "safety_precautions": (
            "Complete track isolation; crane slew radius secured away from adjacent lines; "
            "flash-butt welding quality tests required before reopening."
        ),
        "power_block_required": False,
        "traffic_block_required": True,
    },
    "ohe": {
        "department": "Traction Distribution (TRD)",
        "speed_restriction": "Normal track speed once Tower Wagon is cleared",
        "safety_precautions": (
            "25 kV AC OHE power block isolation & discharge rod earthing "
            "confirmed by Traction Power Controller (TPC); permit to work issued."
        ),
        "power_block_required": True,
        "traffic_block_required": True,
    },
    "catenary": {
        "department": "Traction Distribution (TRD)",
        "speed_restriction": "Normal track speed once Tower Wagon is cleared",
        "safety_precautions": (
            "25 kV AC power block isolation confirmed; contact wire tension verified."
        ),
        "power_block_required": True,
        "traffic_block_required": True,
    },
    "signal": {
        "department": "Signal & Telecommunication (S&T)",
        "speed_restriction": "Caution order as per Station Working Rules during disconnection",
        "safety_precautions": (
            "Disconnection Notice (S&T T/351) served to Station Master; "
            "dummy route locking verification; point machine lock-facing test."
        ),
        "power_block_required": False,
        "traffic_block_required": True,
    },
    "point_machine": {
        "department": "Signal & Telecommunication (S&T)",
        "speed_restriction": "Point clamped and padlocked if train movement necessary",
        "safety_precautions": (
            "Point motor isolation; obstruction test (5mm/3.25mm test gauge); "
            "crank handle interlock verified."
        ),
        "power_block_required": False,
        "traffic_block_required": True,
    },
    "bridge": {
        "department": "Engineering",
        "speed_restriction": "20 km/h dead slow across bridge structure",
        "safety_precautions": (
            "Safety harness and lifeline compulsory; bridge inspection cradle anchored; "
            "safety nets deployed above waterways/roads."
        ),
        "power_block_required": False,
        "traffic_block_required": True,
    },
}


# =============================================================================
# TIME HELPERS
# =============================================================================

def normalize_time_str(time_val: Any) -> str:
    """Normalize times like '01:00 AM', '1:00 pm', '01:00' to 24-hour 'HH:MM'."""
    if not time_val:
        return "00:00"
    s = str(time_val).strip().upper()
    
    # Check for 12-hour AM/PM format
    m = re.match(r"^(\d{1,2}):(\d{2})\s*(AM|PM)?$", s)
    if m:
        hour = int(m.group(1))
        minute = int(m.group(2))
        meridiem = m.group(3)
        if meridiem == "PM" and hour < 12:
            hour += 12
        elif meridiem == "AM" and hour == 12:
            hour = 0
        return f"{hour:02d}:{minute:02d}"
    
    # Fallback to simple HH:MM
    parts = s.split(":")
    if len(parts) >= 2:
        try:
            h = int(parts[0]) % 24
            m = int(parts[1][:2]) % 60
            return f"{h:02d}:{m:02d}"
        except ValueError:
            pass
    return "00:00"


def normalize_date_str(date_val: Any) -> str:
    """Normalize dates like '16/09/2026' or '2026-09-16' to 'YYYY-MM-DD'."""
    if not date_val:
        return datetime.now().strftime("%Y-%m-%d")
    s = str(date_val).strip()
    # Check DD/MM/YYYY
    if "/" in s:
        parts = s.split("/")
        if len(parts) == 3:
            if len(parts[2]) == 4:
                return f"{parts[2]}-{int(parts[1]):02d}-{int(parts[0]):02d}"
    # Check YYYY-MM-DD
    if "-" in s:
        parts = s.split("-")
        if len(parts) == 3 and len(parts[0]) == 4:
            return s
    return datetime.now().strftime("%Y-%m-%d")


# =============================================================================
# REQUEST PARSER
# =============================================================================

def parse_user_block_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parses and enriches a user maintenance block request from the frontend form.

    Respects all user-provided values:
    - User's requested duration (hours)
    - User's requested start and end window
    - User's requested number of workers
    - User's requested machinery / equipment tags
    - User's location (Section, From/To location, From Km, To Km)
    - User's co-location flag (canBeCombined)
    """
    req_id = request_data.get("requestId") or f"REQ-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # 1. Maintenance type & department
    maint_type = str(
        request_data.get("maintenanceType")
        or request_data.get("maintenance_required")
        or request_data.get("taskType")
        or "Track Maintenance"
    ).strip()

    raw_dept = request_data.get("department", "")
    
    # Infer safety profile
    maint_type_lower = maint_type.lower()
    matched_profile = None
    for key, profile in ACTIVITY_SAFETY_PROFILES.items():
        if key in maint_type_lower:
            matched_profile = profile
            break
    if not matched_profile:
        # Check department hints
        if "ohe" in maint_type_lower or "traction" in maint_type_lower or "trd" in str(raw_dept).lower():
            matched_profile = ACTIVITY_SAFETY_PROFILES["ohe"]
        elif "sig" in maint_type_lower or "point" in maint_type_lower or "s&t" in str(raw_dept).lower():
            matched_profile = ACTIVITY_SAFETY_PROFILES["signal"]
        else:
            matched_profile = ACTIVITY_SAFETY_PROFILES["track"]

    department = raw_dept if raw_dept else matched_profile["department"]

    # 2. Section & Linear Km Coordinates
    section_id = request_data.get("sectionId") or request_data.get("section")
    from_loc = request_data.get("fromLocation", "").strip()
    to_loc = request_data.get("toLocation", "").strip()

    if not section_id:
        if from_loc and to_loc:
            section_id = f"{from_loc[:3].upper()}-{to_loc[:3].upper()}"
        else:
            section_id = "LNL-PUNE"

    from_km = request_data.get("fromKm")
    to_km = request_data.get("toKm")
    try:
        from_km = float(from_km) if from_km is not None else 0.0
    except (ValueError, TypeError):
        from_km = 0.0

    try:
        to_km = float(to_km) if to_km is not None else from_km + 5.0
    except (ValueError, TypeError):
        to_km = from_km + 5.0

    # 3. User Scheduling Preferences (STRICTLY FROM USER)
    sched_prefs = request_data.get("schedulingPreferences", {})
    
    raw_date = (
        sched_prefs.get("preferredDate")
        or request_data.get("preferredDate")
        or request_data.get("date")
    )
    preferred_date = normalize_date_str(raw_date)

    raw_duration = (
        sched_prefs.get("durationHours")
        or sched_prefs.get("estimatedDuration")
        or request_data.get("estimatedDuration")
        or request_data.get("durationHours")
        or request_data.get("duration")
        or 3.0
    )
    try:
        duration_hours = float(raw_duration)
    except (ValueError, TypeError):
        duration_hours = 3.0

    raw_start = (
        sched_prefs.get("preferredStartTime")
        or request_data.get("preferredStartTime")
        or "01:00"
    )
    raw_end = (
        sched_prefs.get("preferredEndTime")
        or request_data.get("preferredEndTime")
        or "05:00"
    )
    preferred_start_time = normalize_time_str(raw_start)
    preferred_end_time = normalize_time_str(raw_end)

    # 4. User Resources & Equipment (STRICTLY FROM USER)
    res = request_data.get("resources", {})
    raw_workers = (
        res.get("workersRequired")
        or request_data.get("workersRequired")
        or request_data.get("workers")
        or 10
    )
    try:
        workers_required = int(raw_workers)
    except (ValueError, TypeError):
        workers_required = 10

    equipment_required = (
        res.get("equipmentRequired")
        or request_data.get("equipmentRequired")
        or request_data.get("equipment")
        or []
    )
    if isinstance(equipment_required, str):
        equipment_required = [e.strip() for e in equipment_required.split(",") if e.strip()]

    additional_notes = (
        res.get("additionalNotes")
        or request_data.get("additionalNotes")
        or request_data.get("notes")
        or ""
    )

    # 5. Co-location flag (Can be combined)
    raw_combine = request_data.get("canBeCombined", True)
    if isinstance(raw_combine, str):
        can_be_combined = raw_combine.strip().lower() in ["true", "yes", "1", "y"]
    else:
        can_be_combined = bool(raw_combine)

    # 6. Priority
    priority = str(request_data.get("priority", "MEDIUM")).upper()
    if priority not in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        priority = "MEDIUM"

    return {
        "requestId": req_id,
        "department": department,
        "maintenanceType": maint_type,
        "priority": priority,
        "sectionId": section_id,
        "fromLocation": from_loc or section_id.split("-")[0],
        "toLocation": to_loc or (section_id.split("-")[1] if "-" in section_id else section_id),
        "fromKm": from_km,
        "toKm": to_km,
        "linearSpanKm": round(abs(to_km - from_km), 2),
        "preferredDate": preferred_date,
        "durationHours": duration_hours,
        "preferredStartTime": preferred_start_time,
        "preferredEndTime": preferred_end_time,
        "workersRequired": workers_required,
        "equipmentRequired": equipment_required,
        "additionalNotes": additional_notes,
        "canBeCombined": can_be_combined,
        "safetyProtocols": {
            "speedRestriction": matched_profile["speed_restriction"],
            "safetyPrecautions": matched_profile["safety_precautions"],
            "powerBlockRequired": matched_profile["power_block_required"],
            "trafficBlockRequired": matched_profile["traffic_block_required"],
        },
    }
