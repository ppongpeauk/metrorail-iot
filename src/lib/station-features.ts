export type StationFeature =
  | "parking"
  | "hospital"
  | "airport"
  | "amtrak"
  | "vre"
  | "marc";

export const stationFeatureLabels: Record<StationFeature, string> = {
  parking: "Parking",
  hospital: "Hospital",
  airport: "Airport",
  amtrak: "Amtrak",
  vre: "VRE",
  marc: "MARC",
};

const parkingStations = [
  "Ashburn",
  "Loudoun Gateway",
  "Innovation Center",
  "Herndon",
  "Wiehle-Reston East",
  "Vienna Fairfax-GMU",
  "Vienna",
  "Dunn Loring-Merrifield",
  "West Falls Church-VT",
  "West Falls Church-VT/UVA",
  "East Falls Church",
  "Van Dorn St",
  "Franconia-Springfield",
  "Shady Grove",
  "Rockville",
  "Twinbrook",
  "North Bethesda",
  "Grosvenor-Strathmore",
  "Glenmont",
  "Wheaton",
  "Forest Glen",
  "Silver Spring",
  "Takoma",
  "Fort Totten",
  "Greenbelt",
  "College Park-U of Md",
  "Hyattsville Crossing",
  "West Hyattsville",
  "Rhode Island Av-Brentwood",
  "Rhode Island Ave-Brentwood",
  "New Carrollton",
  "Landover",
  "Cheverly",
  "Deanwood",
  "Minnesota Av",
  "Minnesota Ave",
  "Downtown Largo",
  "Morgan Blvd",
  "Addison Rd",
  "Capitol Heights",
  "Anacostia",
  "Congress Heights",
  "Southern Av",
  "Southern Ave",
  "Naylor Rd",
  "Suitland",
  "Branch Av",
  "Branch Ave",
  "Huntington",
] as const;

const featureStations: Record<
  Exclude<StationFeature, "parking">,
  readonly string[]
> = {
  hospital: ["Forest Glen", "Shaw-Howard U", "Foggy Bottom-GWU"],
  airport: [
    "Washington Dulles International Airport",
    "Ronald Reagan Washington National Airport",
  ],
  vre: [
    "L'Enfant Plaza",
    "L’Enfant Plaza",
    "Union Station",
    "Crystal City",
    "King St-Old Town",
    "Franconia-Springfield",
  ],
  amtrak: ["Rockville", "Union Station", "New Carrollton", "King St-Old Town"],
  marc: [
    "Rockville",
    "Silver Spring",
    "Greenbelt",
    "College Park-U of Md",
    "Union Station",
    "New Carrollton",
  ],
};

function normalizeStationName(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

const featuresByStation = new Map<string, StationFeature[]>();

for (const station of parkingStations) {
  featuresByStation.set(normalizeStationName(station), ["parking"]);
}

for (const [feature, stations] of Object.entries(featureStations) as Array<
  [Exclude<StationFeature, "parking">, readonly string[]]
>) {
  for (const station of stations) {
    const key = normalizeStationName(station);
    const current = featuresByStation.get(key) ?? [];
    if (!current.includes(feature)) {
      featuresByStation.set(key, [...current, feature]);
    }
  }
}

export function stationFeaturesFor(name: string): StationFeature[] {
  return featuresByStation.get(normalizeStationName(name)) ?? [];
}
