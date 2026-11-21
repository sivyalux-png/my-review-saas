"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";
import { setActiveBusinessCookie } from "../../../lib/businesses";

export async function selectBusiness(businessId: string) {
  if (typeof businessId !== "string" || !/^[0-9a-f-]{36}$/i.test(businessId)) {
    throw new Error("Choose a valid business location.");
  }
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Unable to verify user before switching business.", userError);
    throw new Error("Please sign in again.");
  }
  if (!userData.user) throw new Error("Please sign in again.");

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) {
    console.error("Unable to verify selected business.", error);
    throw new Error("We couldn't switch business locations.");
  }
  if (!data) throw new Error("That business location is not available on your account.");

  await setActiveBusinessCookie(businessId);
  revalidatePath("/dashboard", "layout");
}

export async function createBusinessLocation(
  _previousState: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const businessName = String(formData.get("businessName") ?? "").trim();
  if (!businessName || businessName.length > 160) {
    return { error: "Enter a business name of 1 to 160 characters." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Unable to verify user before creating business.", userError);
    return { error: "Please sign in again." };
  }
  if (!userData.user) return { error: "Please sign in again." };

  const { data: businessId, error } = await supabase.rpc("create_business", {
    p_business_name: businessName,
  });
  if (error) {
    if (error.code === "P0001") return { error: error.message };
    console.error("Unable to create business location.", error);
    return { error: "We couldn't create that location. Please try again." };
  }
  if (typeof businessId !== "string") {
    console.error("Creating a business returned an invalid ID.", businessId);
    return { error: "The location may have been created, but we couldn't confirm it. Refresh the page." };
  }

  await setActiveBusinessCookie(businessId);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  return { success: `${businessName} was added.` };
}
