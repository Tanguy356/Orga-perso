import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EventDetailClient from "./event-detail-client";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*, client:contacts(*)")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, full_name, company")
    .order("full_name");

  return (
    <EventDetailClient
      event={event}
      contacts={contacts ?? []}
    />
  );
}
