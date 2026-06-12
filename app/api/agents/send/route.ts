import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { taskId, to } = await req.json();

    const { data: task, error } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }
    if (task.type !== "email_draft") {
      return NextResponse.json({ error: "Cette tâche n'est pas un email" }, { status: 400 });
    }
    if (task.status !== "approved") {
      return NextResponse.json({ error: "Valide d'abord le brouillon avant d'envoyer" }, { status: 400 });
    }

    const recipient = to || task.payload?.to;
    if (!recipient || !recipient.includes("@")) {
      return NextResponse.json({ error: "Adresse email du destinataire manquante ou invalide" }, { status: 400 });
    }

    await transporter.sendMail({
      from: `"VIZION Studio" <${process.env.GMAIL_USER}>`,
      to: recipient,
      subject: task.payload?.subject ?? "(sans objet)",
      text: task.payload?.body ?? "",
    });

    await supabase
      .from("agent_tasks")
      .update({ status: "done", payload: { ...task.payload, to: recipient, sent_at: new Date().toISOString() } })
      .eq("id", taskId);

    return NextResponse.json({ ok: true, message: `Email envoyé à ${recipient}` });
  } catch (e: any) {
    console.error("SEND ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
