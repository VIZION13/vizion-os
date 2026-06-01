import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'edge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { stems, style, genre, reference } = await req.json()

    const prompt = `Tu es un ingénieur du son expert en mixing et mastering professionnel.
Style musical : ${genre || 'Trap/Urban'}
${style ? `Référence sonore : ${style}` : ''}
${reference ? `Infos piste de référence : ${reference}` : ''}

Stems disponibles : ${stems.join(', ')}

Génère une stratégie de mix professionnelle pour chaque stem.
Le résultat doit être prêt pour les plateformes de streaming (-14 LUFS Spotify).

Réponds UNIQUEMENT en JSON :
{
  "strategy": {
    "master": {
      "lufs_target": -14,
      "limiter_ceiling": -0.3,
      "stereo_width": 1.2
    },
    "stems": {
      "vocal": {
        "volume": 0,
        "eq": { "low_cut": 80, "low": -2, "mid": 2, "high": 3, "presence": 2 },
        "compression": { "threshold": -20, "ratio": 4, "attack": 10, "release": 100 },
        "reverb": { "wet": 0.2, "decay": 1.5 },
        "delay": { "wet": 0.15, "time": 0.25, "feedback": 0.3 },
        "autotune": { "enabled": true, "strength": 0.8, "speed": "fast" },
        "saturation": 0.1
      },
      "instru": {
        "volume": -3,
        "eq": { "low_cut": 0, "low": 0, "mid": -1, "high": 1, "presence": 0 },
        "compression": { "threshold": -12, "ratio": 2, "attack": 5, "release": 200 },
        "reverb": { "wet": 0, "decay": 0 },
        "delay": { "wet": 0, "time": 0, "feedback": 0 },
        "autotune": { "enabled": false, "strength": 0, "speed": "none" },
        "saturation": 0.05
      }
    },
    "tips": "Conseils spécifiques pour ce style musical"
  }
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
    })

    const text = completion.choices[0].message.content ?? ''
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ error: 'Parse error', raw: text }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
