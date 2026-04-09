import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Use service role or anon key for public inserts
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.from("contacts").insert({
      full_name: body.full_name || "",
      company: body.company || "",
      email: body.email || "",
      phone: body.phone || "",
      source: "website",
      stage: "new",
      notes: [
        body.event_type ? `Event type: ${body.event_type}` : "",
        body.event_date ? `Event date: ${body.event_date}` : "",
        body.message ? `Message: ${body.message}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
