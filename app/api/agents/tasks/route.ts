import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Liste des tâches (pending d'abord, puis récentes)
export async function GET() {
  const { data, error } = await supabase
    .from("agent_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

// Mise à jour du statut (approved / rejected / done)
export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  if (!id || !["approved", "rejected", "done", "pending"].includes(status)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  const { error } = await supabase.from("agent_tasks").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
