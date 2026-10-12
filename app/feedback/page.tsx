import FeedbackForm from "./feedback-form";

type FeedbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseRating(value: string | undefined) {
  if (!value || !/^[1-5]$/.test(value)) return null;
  return Number(value);
}

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const params = await searchParams;
  const rating = parseRating(firstParam(params.stars)) ?? parseRating(firstParam(params.rating));
  const businessName = firstParam(params.business)?.trim().slice(0, 100) || "Your business";
  const email = firstParam(params.email)?.trim().slice(0, 254) || "";
  const phone = firstParam(params.phone)?.trim().slice(0, 40) || "";

  return (
    <FeedbackForm
      businessName={businessName}
      initialContact={email || phone}
      initialContactType={email ? "email" : phone ? "tel" : "text"}
      rating={rating}
    />
  );
}
