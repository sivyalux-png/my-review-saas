export type AppSumoTier = "Tier 1" | "Tier 2" | "Tier 3";

export type TierEntitlement = {
  name: AppSumoTier;
  price: number;
  emailCredits: number;
  smsCredits: number;
  channels: readonly ("Email" | "SMS" | "WhatsApp")[];
  locations: string;
};

export const appSumoTiers: readonly TierEntitlement[] = [
  {
    name: "Tier 1",
    price: 69,
    emailCredits: 1000,
    smsCredits: 0,
    channels: ["Email"],
    locations: "1 location",
  },
  {
    name: "Tier 2",
    price: 99,
    emailCredits: 5000,
    smsCredits: 0,
    channels: ["Email"],
    locations: "3 locations",
  },
  {
    name: "Tier 3",
    price: 189,
    emailCredits: 10000,
    smsCredits: 500,
    channels: ["Email", "SMS", "WhatsApp"],
    locations: "10 locations",
  },
];

export function normalizeAppSumoTier(value: string | null | undefined): AppSumoTier | null {
  switch (value?.trim().toLowerCase()) {
    case "tier 1":
    case "starter":
      return "Tier 1";
    case "tier 2":
    case "plus":
    case "appsumo plus":
    case "growth":
      return "Tier 2";
    case "tier 3":
    case "unlimited":
      return "Tier 3";
    default:
      return null;
  }
}

export function getTierEntitlement(value: string | null | undefined) {
  const tier = normalizeAppSumoTier(value);
  return appSumoTiers.find((item) => item.name === tier) ?? null;
}
