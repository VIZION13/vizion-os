// ============================================
// VIZION OS v2 — LOT 28 : VIZION AGENTS
// app/api/agents/chat/route.ts
// Boucle agentique : GPT-4o + tool calling + Supabase
// ============================================

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { AGENTS, AgentId } from "@/lib/agents/agents-config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role côté serveur uniquement
);

// ---------- Exécution des tools ----------
async function executeTool(agentId: AgentId, name: string, args: any): Promise<string> {
  try {
    switch (name) {
      // --- NOVA (community) ---
      case "add_to_content_calendar": {
        const { error } = await supabase.from("agent_content_calendar").insert({
          platform: args.platform,
          content_type: args.content_type,
          caption: args.caption,
          hashtags: args.hashtags ?? null,
          visual_idea: args.visual_idea ?? null,
          publish_date: args.publish_date ?? null,
          status: "idée",
        });
        if (error) throw error;
        return `✅ Contenu ajouté au calendrier éditorial (${args.platform} / ${args.content_type}).`;
      }

      // --- ORION (prospection) ---
      case "add_contact": {
        const { error } = await supabase.from("agent_contacts").insert({
          name: args.name,
          company: args.company ?? null,
          email: args.email ?? null,
          instagram: args.instagram ?? null,
          category: args.category ?? "prospect",
          notes: args.notes ?? null,
        });
        if (error) throw error;
        return `✅ Contact "${args.name}" ajouté au CRM.`;
      }
      case "update_pipeline": {
        const { data, error } = await supabase
          .from("agent_contacts")
          .update({
            pipeline_stage: args.pipeline_stage,
            notes: args.notes ?? undefined,
            last_contact: new Date().toISOString(),
          })
          .ilike("name", `%${args.name}%`)
          .select();
        if (error) throw error;
        if (!data?.length) return `⚠️ Aucun contact trouvé pour "${args.name}".`;
        return `✅ ${data[0].name} → stade "${args.pipeline_stage}".`;
      }
      case "list_contacts": {
        let q = supabase
          .from("agent_contacts")
          .select("name, company, email, instagram, category, pipeline_stage, last_contact")
          .order("created_at", { ascending: false })
          .limit(30);
        if (args.pipeline_stage) q = q.eq("pipeline_stage", args.pipeline_stage);
        const { data, error } = await q;
        if (error) throw error;
        return JSON.stringify(data ?? []);
      }

      // --- ATLAS (booking) ---
      case "check_availability": {
        const { data, error } = await supabase
          .from("agent_bookings")
          .select("title, start_time, end_time, status")
          .neq("status", "annulé")
          .lt("start_time", args.end_time)
          .gt("end_time", args.start_time);
        if (error) throw error;
        if (!data?.length) return "✅ Créneau libre, aucun conflit.";
        return `⚠️ Conflits détectés : ${JSON.stringify(data)}`;
      }
      case "create_booking": {
        const { error } = await supabase.from("agent_bookings").insert({
          title: args.title,
          booking_type: args.booking_type,
          start_time: args.start_time,
          end_time: args.end_time,
          location: args.location ?? null,
          price: args.price ?? null,
          notes: args.notes ?? null,
          status: "confirmé",
        });
        if (error) throw error;
        return `✅ Booking "${args.title}" créé (${args.booking_type}).`;
      }
      case "list_bookings": {
        const from = args.from_date ?? new Date().toISOString();
        const { data, error } = await supabase
          .from("agent_bookings")
          .select("title, booking_type, start_time, end_time, location, price, status")
          .gte("start_time", from)
          .neq("status", "annulé")
          .order("start_time", { ascending: true })
          .limit(20);
        if (error) throw error;
        return JSON.stringify(data ?? []);
      }
      case "cancel_booking": {
        const { data, error } = await supabase
          .from("agent_bookings")
          .update({ status: "annulé" })
          .ilike("title", `%${args.title}%`)
          .select();
        if (error) throw error;
        if (!data?.length) return `⚠️ Aucun booking trouvé pour "${args.title}".`;
        return `✅ Booking "${data[0].title}" annulé.`;
      }

      // --- ECHO (mailing) ---
      case "create_email_draft": {
        const { error } = await supabase.from("agent_tasks").insert({
          agent_id: agentId,
          type: "email_draft",
          title: `Email : ${args.subject}`,
          payload: { to: args.to ?? null, subject: args.subject, body: args.body },
          scheduled_for: args.send_date ?? null,
          status: "pending",
        });
        if (error) throw error;
        return `✅ Brouillon d'email créé : "${args.subject}" (en attente de validation).`;
      }

      // --- Commun ---
      case "create_task": {
        const { error } = await supabase.from("agent_tasks").insert({
          agent_id: agentId,
          type: args.type ?? "custom",
          title: args.title,
          payload: args.payload ?? {},
          status: "pending",
        });
        if (error) throw error;
        return `✅ Tâche "${args.title}" créée (en attente de validation).`;
      }

      default:
        return `⚠️ Tool inconnu : ${name}`;
    }
  } catch (e: any) {
    return `❌ Erreur tool ${name} : ${e.message}`;
  }
}

// ---------- Route POST ----------
export async function POST(req: NextRequest) {
  try {
    const { agentId, messages, conversationId } = await req.json();

    const agent = AGENTS[agentId as AgentId];
    if (!agent) {
      return NextResponse.json({ error: "Agent inconnu" }, { status: 400 });
    }

    // Conversation : créer si nécessaire
    let convId = conversationId;
    if (!convId) {
      const { data } = await supabase
        .from("agent_conversations")
        .insert({ agent_id: agentId, title: messages[messages.length - 1]?.content?.slice(0, 60) ?? "Nouvelle conversation" })
        .select("id")
        .single();
      convId = data?.id;
    }

    // Sauvegarde du message user
    const lastUser = messages[messages.length - 1];
    if (convId && lastUser?.role === "user") {
      await supabase.from("agent_messages").insert({
        conversation_id: convId,
        role: "user",
        content: lastUser.content,
      });
    }

    const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" });

    let conversation: any[] = [
      { role: "system", content: `${agent.systemPrompt}\n\nDate et heure actuelles : ${now}.` },
      ...messages,
    ];

    const toolResults: { name: string; result: string }[] = [];

    // Boucle agentique (max 6 itérations)
    for (let i = 0; i < 6; i++) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: conversation,
        tools: agent.tools,
        temperature: 0.7,
      });

      const msg = completion.choices[0].message;
      conversation.push(msg);

      if (!msg.tool_calls?.length) {
        // Réponse finale
        if (convId) {
          await supabase.from("agent_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: msg.content,
          });
        }
        return NextResponse.json({
          reply: msg.content,
          conversationId: convId,
          toolResults,
        });
      }

      // Exécuter chaque tool call
      for (const tc of msg.tool_calls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        const result = await executeTool(agentId, tc.function.name, args);
        toolResults.push({ name: tc.function.name, result });
        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
    }

    return NextResponse.json({
      reply: "⚠️ Limite d'itérations atteinte. Réessaie en découpant ta demande.",
      conversationId: convId,
      toolResults,
    });
  } catch (e: any) {
    console.error("AGENTS API ERROR:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
