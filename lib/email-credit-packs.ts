export const emailCreditPacks = {
  pri_01m72w6j80cecnz57eap0pnemh: {
    credits: 500,
    price: 9,
    label: "Quick top-up",
  },
  pri_01m72w9jct9j6a746gtfca1qfp: {
    credits: 1500,
    price: 24,
    label: "Most popular",
  },
  pri_01m72wc4d9j9cfn1gfn6hjs75d: {
    credits: 5000,
    price: 69,
    label: "Best value",
  },
} as const;

export type EmailCreditPriceId = keyof typeof emailCreditPacks;

export function getEmailCreditPack(priceId: string) {
  return Object.hasOwn(emailCreditPacks, priceId)
    ? emailCreditPacks[priceId as EmailCreditPriceId]
    : undefined;
}
