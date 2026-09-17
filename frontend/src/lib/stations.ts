export interface Station {
  code: string;
  name: string;
  zone: string;
  division: string;
  sectionId: string;
  state: string;
  lines: string;
  electrified: boolean;
  quietWindow: {
    start: string;
    end: string;
    label: string;
  };
}

export const STATIONS: Station[] = [
  // Central Railway (CR)
  {
    code: "LNL",
    name: "Lonavala",
    zone: "Central Railway (CR)",
    division: "Pune Division",
    sectionId: "LNL-PUNE",
    state: "Maharashtra",
    lines: "Double Line (Ghat Section)",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:30", label: "01:30 AM – 04:30 AM" },
  },
  {
    code: "PUNE",
    name: "Pune Junction",
    zone: "Central Railway (CR)",
    division: "Pune Division",
    sectionId: "LNL-PUNE",
    state: "Maharashtra",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:00", end: "04:00", label: "01:00 AM – 04:00 AM" },
  },
  {
    code: "CSMT",
    name: "Chhatrapati Shivaji Maharaj Terminus",
    zone: "Central Railway (CR)",
    division: "Mumbai CR Division",
    sectionId: "CSMT-KYN",
    state: "Maharashtra",
    lines: "Quadruple Line Suburban",
    electrified: true,
    quietWindow: { start: "01:45", end: "04:15", label: "01:45 AM – 04:15 AM (Mega Block)" },
  },
  {
    code: "KYN",
    name: "Kalyan Junction",
    zone: "Central Railway (CR)",
    division: "Mumbai CR Division",
    sectionId: "KYN-IGP",
    state: "Maharashtra",
    lines: "Multiple Lines Electrified",
    electrified: true,
    quietWindow: { start: "02:00", end: "04:30", label: "02:00 AM – 04:30 AM" },
  },
  {
    code: "NGP",
    name: "Nagpur Junction",
    zone: "Central Railway (CR)",
    division: "Nagpur Division",
    sectionId: "NGP-WR",
    state: "Maharashtra",
    lines: "Double Line Electrified (Golden Diagonal)",
    electrified: true,
    quietWindow: { start: "01:15", end: "04:15", label: "01:15 AM – 04:15 AM" },
  },
  {
    code: "BSL",
    name: "Bhusaval Junction",
    zone: "Central Railway (CR)",
    division: "Bhusaval Division",
    sectionId: "BSL-JL",
    state: "Maharashtra",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:00", label: "01:30 AM – 04:00 AM" },
  },
  {
    code: "SUR",
    name: "Solapur Junction",
    zone: "Central Railway (CR)",
    division: "Solapur Division",
    sectionId: "SUR-PUNE",
    state: "Maharashtra",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "02:00", end: "05:00", label: "02:00 AM – 05:00 AM" },
  },

  // Northern Railway (NR)
  {
    code: "NDLS",
    name: "New Delhi",
    zone: "Northern Railway (NR)",
    division: "Delhi Division",
    sectionId: "NDLS-CNB",
    state: "Delhi",
    lines: "High Density Network (HDN 1)",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:00", label: "01:30 AM – 04:00 AM" },
  },
  {
    code: "DLI",
    name: "Old Delhi",
    zone: "Northern Railway (NR)",
    division: "Delhi Division",
    sectionId: "DLI-UMB",
    state: "Delhi",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:45", end: "04:15", label: "01:45 AM – 04:15 AM" },
  },
  {
    code: "NZM",
    name: "Hazrat Nizamuddin",
    zone: "Northern Railway (NR)",
    division: "Delhi Division",
    sectionId: "NZM-KOTA",
    state: "Delhi",
    lines: "Double Line (Semi-High Speed 160 km/h)",
    electrified: true,
    quietWindow: { start: "02:00", end: "04:30", label: "02:00 AM – 04:30 AM" },
  },
  {
    code: "LKO",
    name: "Lucknow Charbagh",
    zone: "Northern Railway (NR)",
    division: "Lucknow NR Division",
    sectionId: "LKO-CNB",
    state: "Uttar Pradesh",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:00", end: "04:00", label: "01:00 AM – 04:00 AM" },
  },
  {
    code: "UMB",
    name: "Ambala Cantt Junction",
    zone: "Northern Railway (NR)",
    division: "Ambala Division",
    sectionId: "UMB-NDLS",
    state: "Haryana",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:30", label: "01:30 AM – 04:30 AM" },
  },
  {
    code: "JAT",
    name: "Jammu Tawi",
    zone: "Northern Railway (NR)",
    division: "Firozpur Division",
    sectionId: "JAT-SVDK",
    state: "Jammu & Kashmir",
    lines: "Single Line / Ghat Section",
    electrified: true,
    quietWindow: { start: "00:30", end: "04:00", label: "00:30 AM – 04:00 AM" },
  },

  // Western Railway (WR)
  {
    code: "MMCT",
    name: "Mumbai Central",
    zone: "Western Railway (WR)",
    division: "Mumbai WR Division",
    sectionId: "MMCT-ST",
    state: "Maharashtra",
    lines: "Quadruple Line Electrified",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:15", label: "01:30 AM – 04:15 AM (Night Jumbo Block)" },
  },
  {
    code: "ADI",
    name: "Ahmedabad Junction",
    zone: "Western Railway (WR)",
    division: "Ahmedabad Division",
    sectionId: "ADI-BRC",
    state: "Gujarat",
    lines: "Double Line High Density",
    electrified: true,
    quietWindow: { start: "01:15", end: "04:15", label: "01:15 AM – 04:15 AM" },
  },
  {
    code: "BRC",
    name: "Vadodara Junction",
    zone: "Western Railway (WR)",
    division: "Vadodara Division",
    sectionId: "BRC-RTM",
    state: "Gujarat",
    lines: "Double Line Electrified (Western DFC Junction)",
    electrified: true,
    quietWindow: { start: "01:45", end: "04:45", label: "01:45 AM – 04:45 AM" },
  },
  {
    code: "RTM",
    name: "Ratlam Junction",
    zone: "Western Railway (WR)",
    division: "Ratlam Division",
    sectionId: "RTM-KOTA",
    state: "Madhya Pradesh",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "02:00", end: "04:30", label: "02:00 AM – 04:30 AM" },
  },
  {
    code: "ST",
    name: "Surat",
    zone: "Western Railway (WR)",
    division: "Mumbai WR Division",
    sectionId: "ST-BRC",
    state: "Gujarat",
    lines: "Double Line High Density",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:30", label: "01:30 AM – 04:30 AM" },
  },

  // Southern Railway (SR)
  {
    code: "MAS",
    name: "Chennai Central",
    zone: "Southern Railway (SR)",
    division: "Chennai Division",
    sectionId: "MAS-GDR",
    state: "Tamil Nadu",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:15", end: "04:00", label: "01:15 AM – 04:00 AM" },
  },
  {
    code: "SBC",
    name: "KSR Bengaluru City",
    zone: "South Western Railway (SWR)",
    division: "Bengaluru Division",
    sectionId: "SBC-MAS",
    state: "Karnataka",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:30", label: "01:30 AM – 04:30 AM" },
  },
  {
    code: "TVC",
    name: "Thiruvananthapuram Central",
    zone: "Southern Railway (SR)",
    division: "Thiruvananthapuram Division",
    sectionId: "TVC-ERS",
    state: "Kerala",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:00", end: "04:00", label: "01:00 AM – 04:00 AM" },
  },
  {
    code: "CBE",
    name: "Coimbatore Junction",
    zone: "Southern Railway (SR)",
    division: "Salem Division",
    sectionId: "CBE-ED",
    state: "Tamil Nadu",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:30", label: "01:30 AM – 04:30 AM" },
  },

  // Eastern Railway (ER) & South Eastern Railway (SER)
  {
    code: "HWH",
    name: "Howrah Junction",
    zone: "Eastern Railway (ER)",
    division: "Howrah Division",
    sectionId: "HWH-KGP",
    state: "West Bengal",
    lines: "Quadruple Line Suburban & Freight",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:15", label: "01:30 AM – 04:15 AM" },
  },
  {
    code: "SDAH",
    name: "Sealdah",
    zone: "Eastern Railway (ER)",
    division: "Sealdah Division",
    sectionId: "SDAH-RHA",
    state: "West Bengal",
    lines: "Suburban High Density Network",
    electrified: true,
    quietWindow: { start: "01:45", end: "04:15", label: "01:45 AM – 04:15 AM" },
  },
  {
    code: "KGP",
    name: "Kharagpur Junction",
    zone: "South Eastern Railway (SER)",
    division: "Kharagpur Division",
    sectionId: "KGP-TATA",
    state: "West Bengal",
    lines: "Triple Line Dedicated Freight / Passenger",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:30", label: "01:30 AM – 04:30 AM" },
  },
  {
    code: "TATA",
    name: "Tatanagar Junction",
    zone: "South Eastern Railway (SER)",
    division: "Chakradharpur Division",
    sectionId: "TATA-ROU",
    state: "Jharkhand",
    lines: "Heavy Mineral / Freight Corridor",
    electrified: true,
    quietWindow: { start: "01:00", end: "04:00", label: "01:00 AM – 04:00 AM" },
  },

  // West Central Railway (WCR)
  {
    code: "BPL",
    name: "Bhopal Junction",
    zone: "West Central Railway (WCR)",
    division: "Bhopal Division",
    sectionId: "BPL-RKMP",
    state: "Madhya Pradesh",
    lines: "Triple Line Electrified",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:30", label: "01:30 AM – 04:30 AM" },
  },
  {
    code: "RKMP",
    name: "Rani Kamlapati",
    zone: "West Central Railway (WCR)",
    division: "Bhopal Division",
    sectionId: "BPL-RKMP",
    state: "Madhya Pradesh",
    lines: "World-Class Redeveloped Station",
    electrified: true,
    quietWindow: { start: "02:00", end: "04:30", label: "02:00 AM – 04:30 AM" },
  },
  {
    code: "JBP",
    name: "Jabalpur Junction",
    zone: "West Central Railway (WCR)",
    division: "Jabalpur Division",
    sectionId: "JBP-ET",
    state: "Madhya Pradesh",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:15", end: "04:15", label: "01:15 AM – 04:15 AM" },
  },
  {
    code: "KOTA",
    name: "Kota Junction",
    zone: "West Central Railway (WCR)",
    division: "Kota Division",
    sectionId: "KOTA-RTM",
    state: "Rajasthan",
    lines: "Double Line Semi-High Speed (130-160 km/h)",
    electrified: true,
    quietWindow: { start: "01:45", end: "04:45", label: "01:45 AM – 04:45 AM" },
  },

  // South Central Railway (SCR)
  {
    code: "SC",
    name: "Secunderabad Junction",
    zone: "South Central Railway (SCR)",
    division: "Secunderabad Division",
    sectionId: "SC-KZJ",
    state: "Telangana",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:30", label: "01:30 AM – 04:30 AM" },
  },
  {
    code: "BZA",
    name: "Vijayawada Junction",
    zone: "South Central Railway (SCR)",
    division: "Vijayawada Division",
    sectionId: "BZA-MAS",
    state: "Andhra Pradesh",
    lines: "Quadruple Line Electrified (Grand Trunk)",
    electrified: true,
    quietWindow: { start: "01:15", end: "04:15", label: "01:15 AM – 04:15 AM" },
  },

  // East Coast Railway (ECoR)
  {
    code: "BBS",
    name: "Bhubaneswar",
    zone: "East Coast Railway (ECoR)",
    division: "Khurda Road Division",
    sectionId: "BBS-KUR",
    state: "Odisha",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:30", label: "01:30 AM – 04:30 AM" },
  },
  {
    code: "VSKP",
    name: "Visakhapatnam Junction",
    zone: "East Coast Railway (ECoR)",
    division: "Waltair Division",
    sectionId: "VSKP-BZA",
    state: "Andhra Pradesh",
    lines: "Coastal Heavy Freight & Passenger Corridor",
    electrified: true,
    quietWindow: { start: "01:00", end: "04:00", label: "01:00 AM – 04:00 AM" },
  },

  // North Western Railway (NWR)
  {
    code: "JP",
    name: "Jaipur Junction",
    zone: "North Western Railway (NWR)",
    division: "Jaipur Division",
    sectionId: "JP-DLI",
    state: "Rajasthan",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:30", label: "01:30 AM – 04:30 AM" },
  },
  {
    code: "JU",
    name: "Jodhpur Junction",
    zone: "North Western Railway (NWR)",
    division: "Jodhpur Division",
    sectionId: "JU-JP",
    state: "Rajasthan",
    lines: "Broad Gauge Electrified",
    electrified: true,
    quietWindow: { start: "01:00", end: "04:00", label: "01:00 AM – 04:00 AM" },
  },

  // East Central Railway (ECR)
  {
    code: "PNBE",
    name: "Patna Junction",
    zone: "East Central Railway (ECR)",
    division: "Danapur Division",
    sectionId: "PNBE-DDU",
    state: "Bihar",
    lines: "High Density Network (HDN 2)",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:15", label: "01:30 AM – 04:15 AM" },
  },
  {
    code: "DDU",
    name: "Pt. Deen Dayal Upadhyaya Junction",
    zone: "East Central Railway (ECR)",
    division: "Pt. DDU Division",
    sectionId: "DDU-CNB",
    state: "Uttar Pradesh",
    lines: "Asia's Largest Railway Marshalling Yard Corridor",
    electrified: true,
    quietWindow: { start: "01:45", end: "04:45", label: "01:45 AM – 04:45 AM" },
  },
];

export const DEFAULT_STATION_CODE = "LNL";

export function getStation(code: string): Station {
  const found = STATIONS.find(
    (s) => s.code.toUpperCase() === (code || "").trim().toUpperCase(),
  );
  if (found) return found;

  // Dynamic fallback for any unlisted Indian railway station code
  const cleanCode = (code || "IR").trim().toUpperCase();
  return {
    code: cleanCode,
    name: `${cleanCode} Station`,
    zone: "Indian Railways",
    division: "Operating Division",
    sectionId: `${cleanCode}-SEC`,
    state: "India",
    lines: "Double Line Electrified",
    electrified: true,
    quietWindow: { start: "01:30", end: "04:30", label: "01:30 AM – 04:30 AM" },
  };
}

export function searchStations(query: string): Station[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) return STATIONS;
  return STATIONS.filter(
    (s) =>
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.division.toLowerCase().includes(q) ||
      s.zone.toLowerCase().includes(q) ||
      s.state.toLowerCase().includes(q),
  );
}
