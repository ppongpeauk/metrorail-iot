export type OccupancyStatus =
  | "EMPTY"
  | "MANY_SEATS_AVAILABLE"
  | "FEW_SEATS_AVAILABLE"
  | "STANDING_ROOM_ONLY"
  | "CRUSHED_STANDING_ROOM_ONLY"
  | "FULL"
  | "NOT_ACCEPTING_PASSENGERS"
  | "NO_DATA_AVAILABLE"
  | "NOT_BOARDABLE";

export const occupancyStatuses: OccupancyStatus[] = [
  "EMPTY",
  "MANY_SEATS_AVAILABLE",
  "FEW_SEATS_AVAILABLE",
  "STANDING_ROOM_ONLY",
  "CRUSHED_STANDING_ROOM_ONLY",
  "FULL",
  "NOT_ACCEPTING_PASSENGERS",
  "NO_DATA_AVAILABLE",
  "NOT_BOARDABLE",
];

export function occupancySymbolCount(
  status: OccupancyStatus | null,
): 0 | 1 | 2 | 3 {
  if (status === "MANY_SEATS_AVAILABLE") return 1;
  if (status === "FEW_SEATS_AVAILABLE") return 2;
  if (status === "FULL") return 3;
  return 0;
}

const legacyPidsDestinationNames: Array<[RegExp, string]> = [
  [/^shady (?:grove|grv|gr)$/i, "Shady Gr"],
  [/^glenmont$/i, "Glenmont"],
  [/^(?:friendship heights|friendship hts|frndshp hts)$/i, "Frndshp Hts"],
  [/^silver spring$/i, "Silver Spring"],
  [/^grosvenor(?:[-–— ]strathmore)?$/i, "Grosvenor"],
  [/^(?:north|n) bethesda$/i, "N Bethesda"],
  [/^white flint$/i, "N Bethesda"],
  [/^takoma$/i, "Takoma"],
  [/^ashburn$/i, "Ashburn"],
  [/^wiehle(?:[-–— ]reston(?: east)?)?$/i, "Wiehle"],
  [/^vienna(?:\/fairfax[-–— ]gmu)?$/i, "Vienna"],
  [
    /^(?:new carroll?ton|n carrollton|new ?crl(?:ton|tn|to)|new carolltn)$/i,
    "NewCrlton",
  ],
  [/^downtown largo$/i, "Largo"],
  [
    /^(?:franconia[-–— ]springfield|frnconia|franconi|franconia)$/i,
    "Franconia",
  ],
  [/^greenbelt$/i, "Greenbelt"],
  [/^branch (?:avenue|ave|av)$/i, "Branch Av"],
  [/^(?:mount vernon|mt\.? ?vern(?:on)?) (?:square|sq).*$/i, "Mt Vernon Sq"],
  [/^fort totten$/i, "Fort Totten"],
  [/^ronald reagan washington national airport$/i, "Natl Airport"],
];

export const LEGACY_PIDS_ROTATION_ANNOUNCEMENTS = [
  "Report suspicious behavior,\nactivities, or unattended\npackages to a Metro employee\nor police officer.",
  "Call 202-962-2121 or\ntext MyMTPD to 696873.",
  "Please allow customers\nto exit before boarding.",
  "Please do not rush\nor hold train doors.",
  "No smoking, eating,\ndrinking, or littering\nin Metro.",
  "Please take all personal\nbelongings with you.",
  "Free shuttle buses\nreplace trains.",
] as const;

const commonDestinationTerms: Array<[RegExp, string]> = [
  [/\bcenter\b/gi, "Ctr."],
  [/\bnational\b/gi, "Natl"],
  [/\binternational\b/gi, "Intl"],
  [/\btown\b/gi, "Twn"],
];

function abbreviateCommonDestinationTerms(destination: string): string {
  return commonDestinationTerms.reduce(
    (abbreviated, [pattern, replacement]) =>
      abbreviated.replace(pattern, replacement),
    destination,
  );
}

export function abbreviatePidsDestination(destination: string): string {
  const normalized = destination.trim();
  return (
    legacyPidsDestinationNames.find(([pattern]) =>
      pattern.test(normalized),
    )?.[1] ?? abbreviateCommonDestinationTerms(normalized)
  );
}

export function abbreviateLegacyLandscapeDestination(
  destination: string,
): string {
  const normalized = destination.trim();
  return abbreviatePidsDestination(normalized);
}
