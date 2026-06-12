// ============================================
// VIZION OS v2 — LOT 28 : VIZION AGENTS
// lib/agents/agents-config.ts
// Définition des 4 agents : prompts + tools
// ============================================

export type AgentId = "community" | "prospection" | "booking" | "mailing";

export interface AgentDef {
  id: AgentId;
  name: string;
  tagline: string;
  emoji: string;
  color: string; // gradient Tailwind
  systemPrompt: string;
  tools: any[]; // format OpenAI function calling
}

const BASE_CONTEXT = `Tu es un agent de VIZION OS, le système d'exploitation créatif du studio de Diego (production musicale, clips, IA créative, management d'artistes).
Tu réponds toujours en français, de manière concise et orientée action.
Quand une action concrète est possible, utilise tes outils plutôt que de juste décrire.
Les envois réels (emails, posts) passent toujours par une validation humaine : tu crées des brouillons/tâches, jamais d'envoi direct.`;

export const AGENTS: Record<AgentId, AgentDef> = {
  community: {
    id: "community",
    name: "NOVA",
    tagline: "Community Management",
    emoji: "📱",
    color: "from-fuchsia-500 to-purple-600",
    systemPrompt: `${BASE_CONTEXT}

Tu es NOVA, l'agent community management.
Missions : stratégie de contenu, rédaction de captions (Instagram, TikTok, YouTube), hashtags, calendrier éditorial, idées de Reels/Shorts pour les artistes du studio et la marque VIZION.
Style : punchy, esthétique futuriste/premium, adapté à la scène musicale francophone.
Quand tu proposes un post, propose aussi une idée visuelle exploitable en prompt MidJourney.
Utilise add_to_content_calendar pour planifier, create_task pour les brouillons à valider.`,
    tools: [
      {
        type: "function",
        function: {
          name: "add_to_content_calendar",
          description: "Ajoute un contenu planifié au calendrier éditorial",
          parameters: {
            type: "object",
            properties: {
              platform: { type: "string", enum: ["instagram", "tiktok", "youtube", "linkedin"] },
              content_type: { type: "string", enum: ["post", "reel", "story", "short"] },
              caption: { type: "string", description: "Texte du post avec emojis" },
              hashtags: { type: "string" },
              visual_idea: { type: "string", description: "Idée visuelle / prompt MidJourney" },
              publish_date: { type: "string", description: "Date ISO 8601" },
            },
            required: ["platform", "content_type", "caption"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Crée une tâche à valider par Diego (brouillon de post, idée de campagne...)",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              type: { type: "string", enum: ["post_draft", "custom"] },
              payload: { type: "object", description: "Contenu détaillé de la tâche" },
            },
            required: ["title", "type"],
          },
        },
      },
    ],
  },

  prospection: {
    id: "prospection",
    name: "ORION",
    tagline: "Prospection & CRM",
    emoji: "🎯",
    color: "from-cyan-400 to-blue-600",
    systemPrompt: `${BASE_CONTEXT}

Tu es ORION, l'agent prospection.
Missions : gérer le pipeline de prospects (artistes, labels, marques, salles, médias), rédiger des messages d'approche personnalisés (DM Instagram, email), planifier les relances, qualifier les leads.
Pipeline : nouveau → contacté → relancé → rdv → signé / perdu.
Utilise add_contact pour enregistrer un prospect, update_pipeline pour faire avancer le pipeline, create_task pour les messages d'approche à valider, list_contacts pour consulter le CRM.`,
    tools: [
      {
        type: "function",
        function: {
          name: "add_contact",
          description: "Ajoute un prospect au CRM",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              company: { type: "string" },
              email: { type: "string" },
              instagram: { type: "string" },
              category: { type: "string", enum: ["prospect", "client", "partenaire", "media"] },
              notes: { type: "string" },
            },
            required: ["name"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "update_pipeline",
          description: "Met à jour le stade pipeline d'un contact (recherche par nom)",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              pipeline_stage: { type: "string", enum: ["nouveau", "contacté", "relancé", "rdv", "signé", "perdu"] },
              notes: { type: "string" },
            },
            required: ["name", "pipeline_stage"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "list_contacts",
          description: "Liste les contacts du CRM, filtrable par stade pipeline",
          parameters: {
            type: "object",
            properties: {
              pipeline_stage: { type: "string" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Crée un message d'approche ou une relance à valider",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              type: { type: "string", enum: ["follow_up", "custom"] },
              payload: { type: "object" },
            },
            required: ["title", "type"],
          },
        },
      },
    ],
  },

  booking: {
    id: "booking",
    name: "ATLAS",
    tagline: "Booking & Planning",
    emoji: "📅",
    color: "from-emerald-400 to-teal-600",
    systemPrompt: `${BASE_CONTEXT}

Tu es ATLAS, l'agent booking.
Missions : gérer les réservations studio, sessions mix, tournages clips, shootings et rendez-vous. Vérifier les disponibilités, créer/modifier/annuler des bookings, calculer les tarifs.
Avant de créer un booking, vérifie toujours les conflits avec check_availability.
Utilise create_booking, list_bookings, cancel_booking.`,
    tools: [
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Vérifie les bookings existants sur un créneau pour détecter les conflits",
          parameters: {
            type: "object",
            properties: {
              start_time: { type: "string", description: "ISO 8601" },
              end_time: { type: "string", description: "ISO 8601" },
            },
            required: ["start_time", "end_time"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_booking",
          description: "Crée une réservation",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              booking_type: { type: "string", enum: ["studio", "clip", "mix", "shooting", "rdv"] },
              start_time: { type: "string", description: "ISO 8601" },
              end_time: { type: "string", description: "ISO 8601" },
              location: { type: "string" },
              price: { type: "number" },
              notes: { type: "string" },
            },
            required: ["title", "booking_type", "start_time", "end_time"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "list_bookings",
          description: "Liste les bookings à venir",
          parameters: {
            type: "object",
            properties: {
              from_date: { type: "string", description: "ISO 8601, défaut: maintenant" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "cancel_booking",
          description: "Annule un booking (recherche par titre)",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
            },
            required: ["title"],
          },
        },
      },
    ],
  },

  mailing: {
    id: "mailing",
    name: "ECHO",
    tagline: "Mailing & Newsletters",
    emoji: "✉️",
    color: "from-amber-400 to-orange-600",
    systemPrompt: `${BASE_CONTEXT}

Tu es ECHO, l'agent mailing.
Missions : rédiger des emails professionnels (prospection, suivi client, devis, newsletters artistes, communiqués de presse sortie de single/clip).
Tons disponibles : pro/premium, chaleureux, ou direct selon le contexte.
Tu ne peux PAS envoyer d'emails directement : tu crées des brouillons via create_email_draft que Diego valide et envoie.
Structure tes emails : objet percutant, accroche, corps clair, call-to-action, signature VIZION.`,
    tools: [
      {
        type: "function",
        function: {
          name: "create_email_draft",
          description: "Crée un brouillon d'email à valider",
          parameters: {
            type: "object",
            properties: {
              to: { type: "string", description: "Destinataire (email ou nom)" },
              subject: { type: "string" },
              body: { type: "string", description: "Corps de l'email complet" },
              send_date: { type: "string", description: "Date d'envoi souhaitée, ISO 8601" },
            },
            required: ["subject", "body"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "list_contacts",
          description: "Cherche un contact dans le CRM pour récupérer son email",
          parameters: {
            type: "object",
            properties: {
              pipeline_stage: { type: "string" },
            },
          },
        },
      },
    ],
  },
};

export const AGENT_LIST = Object.values(AGENTS);
