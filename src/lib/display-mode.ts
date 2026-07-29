export type DisplayMode =
  | "line-progress"
  | "landscape-arrivals"
  | "landscape-arrivals-5"
  | "legacy-landscape-arrivals"
  | "network-map"
  | "wide-arrivals"
  | "legacy-wide-arrivals"
  | "full-arrivals";

export type ScreenAspect = "9:16" | "16:9" | "4:1";

export type ScreenProfileGroup = "landscape" | "portrait" | "wide";

export type ScreenProfile = {
  id: DisplayMode;
  group: ScreenProfileGroup;
  title: string;
  aspect: ScreenAspect;
  description: string;
};

export const screenProfileGroups: Array<{
  id: ScreenProfileGroup;
  label: string;
}> = [
  { id: "landscape", label: "Landscape · 16:9" },
  { id: "portrait", label: "Portrait · 9:16" },
  { id: "wide", label: "Wide · 4:1" },
];

export const screenProfiles: ScreenProfile[] = [
  {
    id: "landscape-arrivals",
    group: "landscape",
    title: "Arrivals (4 rows)",
    aspect: "16:9",
    description: "Standard destination, car, and arrival board.",
  },
  {
    id: "landscape-arrivals-5",
    group: "landscape",
    title: "Arrivals (5 rows)",
    aspect: "16:9",
    description: "Higher-density standard arrival board.",
  },
  {
    id: "legacy-landscape-arrivals",
    group: "landscape",
    title: "Arrivals Pilot (5 rows)",
    aspect: "16:9",
    description: "Condensed LN/CAR/DESTINATION/MIN board with occupancy.",
  },
  {
    id: "line-progress",
    group: "portrait",
    title: "Line Progress",
    aspect: "9:16",
    description: "Next train, stations ahead, transfers, and later trains.",
  },
  {
    id: "full-arrivals",
    group: "portrait",
    title: "Full Arrivals",
    aspect: "9:16",
    description: "High-density portrait arrival board.",
  },
  {
    id: "network-map",
    group: "portrait",
    title: "Arrivals + System Map",
    aspect: "9:16",
    description: "Current arrivals above the Metrorail system map.",
  },
  {
    id: "wide-arrivals",
    group: "wide",
    title: "Wide Arrivals",
    aspect: "4:1",
    description: "Standard two-row wide arrival board.",
  },
  {
    id: "legacy-wide-arrivals",
    group: "wide",
    title: "Wide Arrivals Enriched",
    aspect: "4:1",
    description: "Numbered rows with car count and abbreviated destination.",
  },
];

const displayModes: DisplayMode[] = [
  ...screenProfiles.map(({ id }) => id),
];

export const primaryDisplayModes: DisplayMode[] = [
  "line-progress",
  "landscape-arrivals",
  "legacy-landscape-arrivals",
  "network-map",
  "wide-arrivals",
  "legacy-wide-arrivals",
  "full-arrivals",
];

export function isDisplayMode(value: string): value is DisplayMode {
  return displayModes.includes(value as DisplayMode);
}

export function screenAspect(mode: DisplayMode): ScreenAspect {
  return (
    screenProfiles.find((profile) => profile.id === mode)?.aspect ?? "9:16"
  );
}
