import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ContactDetailClient from "./contact-detail-client";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contact) notFound();

  const { data: interactions } = await supabase
    .from("interactions")
    .select("*")
    .eq("contact_id", id)
    .order("date", { ascending: false });

  const { data: linkedEvents } = await supabase
    .from("events")
    .select("*")
    .eq("client_id", id)
    .order("event_date", { ascending: false });

  return (
    <ContactDetailClient
      contact={contact}
      interactions={interactions ?? []}
      linkedEvents={linkedEvents ?? []}
    />
  );
}
