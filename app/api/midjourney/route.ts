import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MJ_BASE = '--v 8 --style raw --ar 16:9'
const LIGHTING = 'ARRI lighting, rim light cinema, skin glow premium, subtle lens flare, 4K cinematic, shallow depth of field, bounce reflector'

export async function POST(req: NextRequest) {
  const { subject, preset, mood, artist } = await req.json()

  const systemPrompt = `Tu es expert en prompts MidJourney pour la photographie cinématographique de haute qualité.
Tu génères des prompts ultra-précis pour des visuels d'artistes musicaux.
Style signature : ${LIGHTING}
Paramètres fixes : ${MJ_BASE}
Tes prompts sont en anglais, ultra-détaillés, cinématographiques.`

  const userPrompt = `Génère 3 prompts MidJourney différents pour :
Sujet : ${subject}
${artist ? `Artiste : ${artist}` : ''}
${preset ? `Preset : ${preset}` : ''}
${mood ? `Ambiance : ${mood}` : ''}

Réponds UNIQUEMENT en JSON :
{
  "prompts": [
    { "label": "Principal", "prompt": "..., ${LIGHTING}, ${MJ_BASE}" },
    { "label": "Variante sombre", "prompt": "..., ${LIGHTING}, ${MJ_BASE}" },
    { "label": "Variante portrait", "prompt": "..., ${LIGHTING}, ${MJ_BASE}" }
  ]
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 1000,
  })

  const text = completion.choices[0].message.content ?? ''
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ prompts: [{ label: 'Prompt', prompt: text }] })
  }
}
