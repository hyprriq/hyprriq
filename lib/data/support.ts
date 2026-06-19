import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

export type SupportRequestType =
  | "change_request"
  | "billing"
  | "technical"
  | "general"
  | "other";

export type SupportRequest = {
  id: string;
  sr_number: string;
  type: SupportRequestType;
  subject: string;
  body: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  case_id: string | null;
  created_at: string;
  resolved_at: string | null;
};

// Current client's own support requests, newest first.
export async function getSupportRequests(): Promise<SupportRequest[]> {
  const { userId } = await auth();
  if (!userId) return [];
  const supa = createServerClient();
  const { data } = await supa
    .from("support_requests")
    .select("id, sr_number, type, subject, body, status, case_id, created_at, resolved_at")
    .eq("client_id", userId)
    .order("created_at", { ascending: false });
  return (data as SupportRequest[]) ?? [];
}
