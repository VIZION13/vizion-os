# VIZION OS v2

**Creative Intelligence Platform** — Next.js 15 + TypeScript + Tailwind + Shadcn + Supabase + OpenAI + PWA

---

## 🚀 Setup rapide

### 1. Clone et install

```bash
git clone <ton-repo>
cd vizion-os
npm install
```

### 2. Variables d'environnement

Copie `.env.example` en `.env.local` et remplis :

```bash
cp .env.example .env.local
```

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Supabase

- Va dans [supabase.com](https://supabase.com) → ton projet → SQL Editor
- Colle et exécute le contenu de `database/schema.sql`
- Crée les Storage Buckets : `artists`, `clips`, `music`, `contracts`, `invoices`, `documents`

### 4. Dev

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

---

## 📦 Stack

| Tech | Usage |
|------|-------|
| Next.js 15 | Framework |
| TypeScript | Types |
| Tailwind CSS | Styling |
| Shadcn UI | Components |
| Supabase | DB + Storage |
| OpenAI GPT-4o | IA (→ GPT-5.5 dès dispo API) |
| Framer Motion | Animations |
| next-pwa | iPhone PWA |
| Vercel | Deploy |

---

## 🏗 Architecture

```
app/           → Pages Next.js App Router
components/    → UI Components
lib/           → Helpers (openai, supabase, prompts)
types/         → TypeScript interfaces
database/      → schema.sql Supabase
public/        → Assets + manifest PWA
```

---

## 📱 PWA iPhone

1. Build et deploy sur Vercel
2. Sur iPhone : Safari → ton-url.vercel.app → Partager → Ajouter à l'écran d'accueil
3. Lance VIZION OS depuis l'écran d'accueil → mode fullscreen

---

## 🔮 Roadmap LOTs

- [x] **LOT 1** — Architecture + Fondations + Dashboard
- [ ] **LOT 2** — Module CLIP (storyboard, shot list, prompts kling)
- [ ] **LOT 3** — Module MUSIC (Suno, références, librairie)
- [ ] **LOT 4** — Module ARTISTS (roster, profils, projets)
- [ ] **LOT 5** — Module BUSINESS (contrats, factures, CRM)
- [ ] **LOT 6** — Module ADMIN (tâches, agenda, notes)
- [ ] **LOT 7** — Module MEMORY (mémoire IA, timeline)
- [ ] **LOT 8** — Chat VIZION global + Voice
