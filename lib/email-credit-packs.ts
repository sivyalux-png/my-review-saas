type EmailCreditPackDetails = {
  credits: number;
  price: number;
  label: string;
};

export const sandboxEmailCreditPacks = {
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

export const liveEmailCreditPacks = {
  pri_01m7aw9beefjk38t2s7zzjsrzx: {
    credits: 500,
    price: 9,
    label: "Quick top-up",
  },
  pri_01m7aw9c09whw02mn3qn0xqz5w: {
    credits: 1500,
    price: 24,
    label: "Most popular",
  },
  pri_01m7aw9cj6gwn1efax39y4g28m: {
    credits: 5000,
    price: 69,
    label: "Best value",
  },
} as const;

export type EmailCreditPriceId =
  | keyof typeof sandboxEmailCreditPacks
  | keyof typeof liveEmailCreditPacks;

const activeEmailCreditPacks =
  process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
    ? liveEmailCreditPacks
    : sandboxEmailCreditPacks;

export const emailCreditPacks: Record<string, EmailCreditPackDetails> =
  activeEmailCreditPacks;

export function getEmailCreditPack(priceId: string) {
  return Object.hasOwn(emailCreditPacks, priceId)
    ? emailCreditPacks[priceId]
    : undefined;
}
